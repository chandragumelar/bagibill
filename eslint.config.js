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
      "import/no-internal-modules": ["error", { forbid: ["@/features/*/**", "@bagibill/split-engine/*"] }],
    },
  },
  {
    // spec.md 24: a device with a wrong clock must not corrupt ordering, so
    // storage logic takes a Clock instead of reading the system clock
    // itself. clock.ts is the one place allowed to touch it.
    files: ["src/lib/storage/**/*.{ts,tsx}"],
    ignores: ["src/lib/storage/clock.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Inject a Clock instead of calling Date.now() directly — see clock.ts.",
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Inject a Clock instead of using new Date() directly — see clock.ts.",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
