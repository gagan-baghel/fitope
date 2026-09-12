/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as data_exercises from "../data/exercises.js";
import type * as data_foods from "../data/foods.js";
import type * as exercises from "../exercises.js";
import type * as foods from "../foods.js";
import type * as http from "../http.js";
import type * as lib_fitness from "../lib/fitness.js";
import type * as lib_util from "../lib/util.js";
import type * as nutrition from "../nutrition.js";
import type * as profiles from "../profiles.js";
import type * as programs from "../programs.js";
import type * as seed from "../seed.js";
import type * as tracking from "../tracking.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  analytics: typeof analytics;
  auth: typeof auth;
  dashboard: typeof dashboard;
  "data/exercises": typeof data_exercises;
  "data/foods": typeof data_foods;
  exercises: typeof exercises;
  foods: typeof foods;
  http: typeof http;
  "lib/fitness": typeof lib_fitness;
  "lib/util": typeof lib_util;
  nutrition: typeof nutrition;
  profiles: typeof profiles;
  programs: typeof programs;
  seed: typeof seed;
  tracking: typeof tracking;
  workouts: typeof workouts;
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
