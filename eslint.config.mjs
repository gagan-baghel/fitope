import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /**
       * Convex query results are structurally typed per-function; annotating every render
       * helper with the generated shape adds noise without catching bugs the compiler
       * doesn't already catch at the call site. Kept visible as a warning.
       */
      "@typescript-eslint/no-explicit-any": "warn",
      // Progress photos come from Convex file storage, which next/image cannot optimise here.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Every public Convex function must go through lib/functions (arg guard + write throttle).
    files: ["convex/**/*.ts"],
    ignores: ["convex/lib/functions.ts", "convex/_generated/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "./_generated/server",
              importNames: ["mutation", "query", "action"],
              message: "Import mutation/query from ./lib/functions so the security guard applies.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
