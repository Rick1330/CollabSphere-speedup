import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/mocks/*", "@/lib/mock-*", "@/api/mocks/*"],
              message:
                "Production UI code must consume data via adapters, not direct mock imports.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Feature-level UI must route API access through adapters instead of direct fetch.",
        },
      ],
    },
  },
  {
    files: [
      "src/api/client/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "vitest.config.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
);
