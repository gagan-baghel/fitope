"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Body weight and height are stored in kg/cm always; the unit preference is a display
 * concern. Training loads stay in kg because that is how plates are marked.
 */
export const kgToLb = (kg: number) => kg * 2.2046226;
export const lbToKg = (lb: number) => lb / 2.2046226;
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;

export type Units = {
  imperial: boolean;
  weightUnit: string;
  lengthUnit: string;
  /** kg -> display number in the user's unit */
  outWeight: (kg?: number | null) => number | undefined;
  /** display number in the user's unit -> kg */
  inWeight: (v?: number) => number | undefined;
  weight: (kg?: number | null, digits?: number) => string;
  length: (cm?: number | null) => string;
  outLength: (cm?: number | null) => number | undefined;
  inLength: (v?: number) => number | undefined;
  weightStep: number;
};

export function useUnits(): Units {
  const me = useQuery(api.profiles.me, {});
  const imperial = me?.profile?.units === "imperial";
  const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  return {
    imperial,
    weightUnit: imperial ? "lb" : "kg",
    lengthUnit: imperial ? "in" : "cm",
    weightStep: imperial ? 0.2 : 0.1,
    outWeight: (kg) => (kg == null ? undefined : round(imperial ? kgToLb(kg) : kg)),
    inWeight: (v) => (v == null ? undefined : round(imperial ? lbToKg(v) : v, 2)),
    outLength: (cm) => (cm == null ? undefined : round(imperial ? cmToIn(cm) : cm)),
    inLength: (v) => (v == null ? undefined : round(imperial ? inToCm(v) : v, 1)),
    weight: (kg, digits = 1) =>
      kg == null ? "–" : `${round(imperial ? kgToLb(kg) : kg, digits).toFixed(digits)} ${imperial ? "lb" : "kg"}`,
    length: (cm) => (cm == null ? "–" : `${round(imperial ? cmToIn(cm) : cm)} ${imperial ? "in" : "cm"}`),
  };
}
