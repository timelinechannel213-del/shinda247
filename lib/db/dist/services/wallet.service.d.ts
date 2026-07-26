export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund' | 'bonus';
export interface CreditResult {
    success: boolean;
    newBalanceCents: number;
    transactionId: number;
    error?: string;
}
export interface DebitResult {
    success: boolean;
    newBalanceCents: number;
    transactionId: number;
    error?: string;
}
export declare function creditWallet(userId: number, amountCents: number, type: TransactionType, opts?: {
    mpesaRef?: string;
    checkoutRequestId?: string;
    mpesaPhone?: string;
    gameId?: number;
    betId?: number;
    description?: string;
}): Promise<CreditResult>;
export declare function debitWallet(userId: number, amountCents: number, type: TransactionType, opts?: {
    gameId?: number;
    betId?: number;
    description?: string;
    mpesaRef?: string;
    mpesaPhone?: string;
}): Promise<DebitResult>;
export declare function getBalance(userId: number): Promise<{
    balanceCents: number;
    lockedCents: number;
} | null>;
export declare function createWallet(userId: number): Promise<void>;
//# sourceMappingURL=wallet.service.d.ts.map