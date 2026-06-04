import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { wallets, mpesaCallbacks, transactions, users } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { creditWallet } from '@workspace/db';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { logger } from '../lib/logger';

const router: IRouter = Router();

const MPESA_ENV      = process.env.MPESA_ENV ?? 'sandbox';
const BASE_URL       = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';
const SHORTCODE      = process.env.MPESA_SHORTCODE ?? '';
const PASSKEY        = process.env.MPESA_PASSKEY ?? '';
const CALLBACK_URL   = process.env.MPESA_CALLBACK_URL ?? '';
const CONSUMER_KEY   = process.env.MPESA_CONSUMER_KEY ?? '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET ?? '';

async function getMpesaToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Failed to get M-Pesa token: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function getPassword(timestamp: string): string {
  const raw = `${SHORTCODE}${PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

router.post('/mpesa/stk-push', requireAuth, async (req: AuthRequest, res) => {
  const { amountKes } = req.body as { amountKes?: number };
  const userId = req.userId!;

  if (!amountKes || amountKes < 1) {
    res.status(400).json({ error: 'amountKes must be at least 1' });
    return;
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET || !SHORTCODE || !PASSKEY || !CALLBACK_URL) {
    res.status(503).json({ error: 'M-Pesa not configured. Contact support.' });
    return;
  }

  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  try {
    const token     = await getMpesaToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.round(amountKes),
        PartyA:            user.phone,
        PartyB:            SHORTCODE,
        PhoneNumber:       user.phone,
        CallBackURL:       CALLBACK_URL,
        AccountReference:  `Shinda247-${userId}`,
        TransactionDesc:   `Deposit KES ${amountKes}`,
      }),
    });

    const stkData = await stkRes.json() as {
      ResponseCode?: string;
      CheckoutRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (stkData.ResponseCode !== '0') {
      logger.error({ stkData }, 'STK push failed');
      res.status(400).json({ error: stkData.errorMessage ?? 'STK push failed' });
      return;
    }

    res.json({
      success:           true,
      checkoutRequestId: stkData.CheckoutRequestID,
      message:           stkData.CustomerMessage ?? 'Enter your M-Pesa PIN on your phone',
    });
  } catch (err) {
    logger.error({ err }, 'STK push error');
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

router.post('/mpesa/callback', async (req, res) => {
  const raw = JSON.stringify(req.body);
  logger.info({ raw }, 'M-Pesa callback received');

  try {
    const body = req.body as {
      Body?: {
        stkCallback?: {
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
          CallbackMetadata?: {
            Item?: Array<{ Name: string; Value: unknown }>;
          };
        };
      };
    };

    const cb = body.Body?.stkCallback;
    if (!cb) {
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      return;
    }

    const checkoutRequestId = cb.CheckoutRequestID ?? '';
    const resultCode        = cb.ResultCode ?? -1;

    const existing = await db
      .select()
      .from(mpesaCallbacks)
      .where(eq(mpesaCallbacks.checkoutRequestId, checkoutRequestId));

    if (existing.length > 0) {
      res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
      return;
    }

    let amountCents: number | null = null;
    let mpesaReceiptNumber: string | null = null;
    let phoneNumber: string | null = null;

    if (resultCode === 0 && cb.CallbackMetadata?.Item) {
      for (const item of cb.CallbackMetadata.Item) {
        if (item.Name === 'Amount')              amountCents     = Math.round(Number(item.Value) * 100);
        if (item.Name === 'MpesaReceiptNumber')  mpesaReceiptNumber = String(item.Value);
        if (item.Name === 'PhoneNumber')         phoneNumber       = String(item.Value);
      }
    }

    await db.insert(mpesaCallbacks).values({
      checkoutRequestId,
      merchantRequestId:   cb.MerchantRequestID,
      resultCode,
      resultDesc:          cb.ResultDesc,
      mpesaReceiptNumber:  mpesaReceiptNumber ?? undefined,
      amountCents:         amountCents ?? undefined,
      phoneNumber:         phoneNumber ?? undefined,
      rawPayload:          raw,
      processed:           false,
    });

    if (resultCode === 0 && amountCents && phoneNumber) {
      const phone = String(phoneNumber).replace(/^254/, '0');
      const normalizedPhone = '254' + phone.replace(/^0/, '');

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, normalizedPhone));

      if (user) {
        await creditWallet(user.id, amountCents, 'deposit', {
          mpesaRef:          mpesaReceiptNumber ?? undefined,
          checkoutRequestId,
          mpesaPhone:        normalizedPhone,
          description:       `M-Pesa deposit ${mpesaReceiptNumber}`,
        });

        await db.update(mpesaCallbacks)
          .set({ processed: true, processedAt: new Date() })
          .where(eq(mpesaCallbacks.checkoutRequestId, checkoutRequestId));

        logger.info({ userId: user.id, amountCents }, 'Wallet credited from M-Pesa');
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    logger.error({ err }, 'Callback processing error');
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

router.get('/mpesa/balance', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [wallet] = await db
    .select({ balanceCents: wallets.balanceCents })
    .from(wallets)
    .where(eq(wallets.userId, userId));

  res.json({ balanceCents: wallet?.balanceCents ?? 0 });
});

export default router;
