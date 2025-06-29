//! F**K! `@rollup/plugin-eslint` not support the new config file

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  globalIgnores(["dist/*", "*.config.*"]),
  {
    files: ["src/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        console: "readonly",
        module: "readonly",
      },
    },
    rules: {},
  },
]);
