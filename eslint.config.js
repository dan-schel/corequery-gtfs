import eslint from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

const customRules = {
  rules: {
    // Ignore unused variables if they start with underscores.
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

    // Require === and !==, except when comparing to null.
    "eqeqeq": ["warn", "always", { null: "ignore" }],

    // Warn on console.log uses, but allow console.warn.
    "no-console": ["warn", { allow: ["warn", "error"] }],

    // Warn about prettier violations.
    "prettier/prettier": "warn",

    // Warn about non-null assertions.
    "@typescript-eslint/no-non-null-assertion": "warn",

    // Warn about relying on truthy/falsy values.
    "@typescript-eslint/strict-boolean-expressions": [
      "warn",
      { allowString: false, allowNumber: false, allowNullableObject: false },
    ],

    // These errors are often just symptoms of another error, and obscure the
    // actual error, so downngrade them to warnings.
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
  },
};

export default tseslint.config(
  {
    ignores: ["node_modules", "dist", "coverage"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  customRules,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
  },
);
