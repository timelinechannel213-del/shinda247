import { pgTable, serial, integer, bigint, varchar, timestamp, pgEnum, boolean, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'deposit',       // M-Pesa STK push credited
  'withdrawal',    // B2C payout to phone
  'bet',           // Bet placed — debit
  'win',           // Cashout win — credit
  'refund',        // Bet refunded (e.g. game error)
  'bonus',         // Promotional credit
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',    // Initiated, awaiting confirmation
  'completed',  // Confirmed and processed
  'failed',     // Failed / reversed
  'cancelled',  // Cancelled by user or system
]);

export const wallets = pgTable('wallets', {
  id:            serial('id').primaryKey(),
  userId:        integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  // Stored in KES cents (integer) to avoid floating point issues
  // e.g. KES 100.50 = 10050 cents
  balanceCents:  bigint('balance_cents', { mode: 'number' }).notNull().default(0),
  lockedCents:   bigint('locked_cents', { mode: 'number' }).notNull().default(0),
  totalDeposited: bigint('total_deposited', { mode: 'number' }).notNull().default(0),
  totalWithdrawn: bigint('total_withdrawn', { mode: 'number' }).notNull().default(0),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id:              serial('id').primaryKey(),
  userId:          integer('user_id').notNull().references(() => users.id),
  type:            transactionTypeEnum('type').notNull(),
  status:          transactionStatusEnum('status').notNull().default('pending'),
  // Amount in KES cents
  amountCents:     bigint('amount_cents', { mode: 'number' }).notNull(),
  balanceBefore:   bigint('balance_before', { mode: 'number' }).notNull(),
  balanceAfter:    bigint('balance_after', { mode: 'number' }).notNull(),
  // M-Pesa specific fields
  mpesaRef:        varchar('mpesa_ref', { length: 50 }),          // M-Pesa transaction ID
  checkoutRequestId: varchar('checkout_request_id', { length: 100 }), // STK push ID — for deduplication
  mpesaPhone:      varchar('mpesa_phone', { length: 20 }),
  // Game specific fields
  gameId:          integer('game_id'),                             // FK set after games table created
  betId:           integer('bet_id'),                              // FK set after bets table created
  // Metadata
  description:     text('description'),
  failureReason:   text('failure_reason'),
  processedAt:     timestamp('processed_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

export const mpesaCallbacks = pgTable('mpesa_callbacks', {
  id:               serial('id').primaryKey(),
  checkoutRequestId: varchar('checkout_request_id', { length: 100 }).notNull().unique(),
  merchantRequestId: varchar('merchant_request_id', { length: 100 }),
  resultCode:       integer('result_code').notNull(),
  resultDesc:       text('result_desc'),
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }),
  amountCents:      bigint('amount_cents', { mode: 'number' }),
  phoneNumber:      varchar('phone_number', { length: 20 }),
  rawPayload:       text('raw_payload').notNull(),
  processed:        boolean('processed').notNull().default(false),
  processedAt:      timestamp('processed_at'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
});

export const insertWalletSchema      = createInsertSchema(wallets);
export const selectWalletSchema      = createSelectSchema(wallets);
export const insertTransactionSchema = createInsertSchema(transactions);
export const selectTransactionSchema = createSelectSchema(transactions);
export const insertCallbackSchema    = createInsertSchema(mpesaCallbacks);
