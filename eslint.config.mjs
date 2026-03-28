import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific generated/native artifacts:
    "android/**/build/**",
    "android/.gradle/**",
    "android/app/src/main/assets/**",
    "public/_next/**",
    "dist/**",
    "coverage/**",
    "fix-paths.js",
    "prepare-android.js",
    "fix-gradle-proguard.js",
  ]),
]);

export default eslintConfig;
