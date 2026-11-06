import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Images are served pre-compressed from /api/files with their own srcset
      // (images.unoptimized), so next/image adds nothing here.
      "@next/next/no-img-element": "off",
      // A leading underscore marks an intentionally unused parameter.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".local/**",
    "node-compile-cache/**",
  ]),
]);

export default eslintConfig;
