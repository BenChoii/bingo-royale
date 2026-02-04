/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as boss from "../boss.js";
import type * as challenges from "../challenges.js";
import type * as chat from "../chat.js";
import type * as cosmetics from "../cosmetics.js";
import type * as daily from "../daily.js";
import type * as games from "../games.js";
import type * as leaderboard from "../leaderboard.js";
import type * as luckyline from "../luckyline.js";
import type * as paymentHelpers from "../paymentHelpers.js";
import type * as payments from "../payments.js";
import type * as powerups from "../powerups.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  boss: typeof boss;
  challenges: typeof challenges;
  chat: typeof chat;
  cosmetics: typeof cosmetics;
  daily: typeof daily;
  games: typeof games;
  leaderboard: typeof leaderboard;
  luckyline: typeof luckyline;
  paymentHelpers: typeof paymentHelpers;
  payments: typeof payments;
  powerups: typeof powerups;
  rooms: typeof rooms;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
