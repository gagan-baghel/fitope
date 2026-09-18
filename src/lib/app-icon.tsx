import { ImageResponse } from "next/og";

const PATHS = [
  "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",
  "m2.5 21.5 1.4-1.4",
  "m20.1 3.9 1.4-1.4",
  "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",
  "m9.6 14.4 4.8-4.8",
];

/**
 * Lime dumbbell on ink, full-bleed. `maskable` shrinks the glyph into the central 80% safe zone
 * so Android's circle/squircle masks never clip it.
 */
export function appIcon(size: number, { maskable = false } = {}) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#12161c" }}>
        <svg width={size * (maskable ? 0.4 : 0.5)} height={size * (maskable ? 0.4 : 0.5)} viewBox="0 0 24 24" fill="none" stroke="#c9f24e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          {PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
