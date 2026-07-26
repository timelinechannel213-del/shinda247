import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ActivePlayer, CashOutRequest, CashOutResponse, ErrorResponse, GameRound, GameState, GetGameHistoryParams, HealthStatus, LeaderboardPlayer, PlaceBetRequest, PlaceBetResponse, WalletInfo } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get current game state
 */
export declare const getGetGameStateUrl: () => string;
export declare const getGameState: (options?: RequestInit) => Promise<GameState>;
export declare const getGetGameStateQueryKey: () => readonly ["/api/game/state"];
export declare const getGetGameStateQueryOptions: <TData = Awaited<ReturnType<typeof getGameState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGameState>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGameStateQueryResult = NonNullable<Awaited<ReturnType<typeof getGameState>>>;
export type GetGameStateQueryError = ErrorType<unknown>;
/**
 * @summary Get current game state
 */
export declare function useGetGameState<TData = Awaited<ReturnType<typeof getGameState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get recent game history
 */
export declare const getGetGameHistoryUrl: (params?: GetGameHistoryParams) => string;
export declare const getGameHistory: (params?: GetGameHistoryParams, options?: RequestInit) => Promise<GameRound[]>;
export declare const getGetGameHistoryQueryKey: (params?: GetGameHistoryParams) => readonly ["/api/game/history", ...GetGameHistoryParams[]];
export declare const getGetGameHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getGameHistory>>, TError = ErrorType<unknown>>(params?: GetGameHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGameHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGameHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getGameHistory>>>;
export type GetGameHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get recent game history
 */
export declare function useGetGameHistory<TData = Awaited<ReturnType<typeof getGameHistory>>, TError = ErrorType<unknown>>(params?: GetGameHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Place a bet for the current game
 */
export declare const getPlaceBetUrl: () => string;
export declare const placeBet: (placeBetRequest: PlaceBetRequest, options?: RequestInit) => Promise<PlaceBetResponse>;
export declare const getPlaceBetMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof placeBet>>, TError, {
        data: BodyType<PlaceBetRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof placeBet>>, TError, {
    data: BodyType<PlaceBetRequest>;
}, TContext>;
export type PlaceBetMutationResult = NonNullable<Awaited<ReturnType<typeof placeBet>>>;
export type PlaceBetMutationBody = BodyType<PlaceBetRequest>;
export type PlaceBetMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Place a bet for the current game
 */
export declare const usePlaceBet: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof placeBet>>, TError, {
        data: BodyType<PlaceBetRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof placeBet>>, TError, {
    data: BodyType<PlaceBetRequest>;
}, TContext>;
/**
 * @summary Cash out current bet
 */
export declare const getCashOutUrl: () => string;
export declare const cashOut: (cashOutRequest: CashOutRequest, options?: RequestInit) => Promise<CashOutResponse>;
export declare const getCashOutMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cashOut>>, TError, {
        data: BodyType<CashOutRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cashOut>>, TError, {
    data: BodyType<CashOutRequest>;
}, TContext>;
export type CashOutMutationResult = NonNullable<Awaited<ReturnType<typeof cashOut>>>;
export type CashOutMutationBody = BodyType<CashOutRequest>;
export type CashOutMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Cash out current bet
 */
export declare const useCashOut: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cashOut>>, TError, {
        data: BodyType<CashOutRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cashOut>>, TError, {
    data: BodyType<CashOutRequest>;
}, TContext>;
/**
 * @summary Get list of active players in current round
 */
export declare const getGetActivePlayersUrl: () => string;
export declare const getActivePlayers: (options?: RequestInit) => Promise<ActivePlayer[]>;
export declare const getGetActivePlayersQueryKey: () => readonly ["/api/players"];
export declare const getGetActivePlayersQueryOptions: <TData = Awaited<ReturnType<typeof getActivePlayers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivePlayers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActivePlayers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActivePlayersQueryResult = NonNullable<Awaited<ReturnType<typeof getActivePlayers>>>;
export type GetActivePlayersQueryError = ErrorType<unknown>;
/**
 * @summary Get list of active players in current round
 */
export declare function useGetActivePlayers<TData = Awaited<ReturnType<typeof getActivePlayers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActivePlayers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get player leaderboard (right sidebar)
 */
export declare const getGetLeaderboardUrl: () => string;
export declare const getLeaderboard: (options?: RequestInit) => Promise<LeaderboardPlayer[]>;
export declare const getGetLeaderboardQueryKey: () => readonly ["/api/players/leaderboard"];
export declare const getGetLeaderboardQueryOptions: <TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeaderboardQueryResult = NonNullable<Awaited<ReturnType<typeof getLeaderboard>>>;
export type GetLeaderboardQueryError = ErrorType<unknown>;
/**
 * @summary Get player leaderboard (right sidebar)
 */
export declare function useGetLeaderboard<TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get current player wallet balance
 */
export declare const getGetWalletUrl: () => string;
export declare const getWallet: (options?: RequestInit) => Promise<WalletInfo>;
export declare const getGetWalletQueryKey: () => readonly ["/api/wallet"];
export declare const getGetWalletQueryOptions: <TData = Awaited<ReturnType<typeof getWallet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWallet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWallet>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWalletQueryResult = NonNullable<Awaited<ReturnType<typeof getWallet>>>;
export type GetWalletQueryError = ErrorType<unknown>;
/**
 * @summary Get current player wallet balance
 */
export declare function useGetWallet<TData = Awaited<ReturnType<typeof getWallet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWallet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map