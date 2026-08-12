import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "packages/tokens/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-nested-ternary": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Cross-feature imports must go through a feature's index.ts, never its internals.
      "import/no-internal-modules": ["error", { forbid: ["@/features/*/**"] }],
    },
  },
  eslintConfigPrettier,
);
