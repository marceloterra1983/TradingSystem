import js from "@eslint/js";
import globals from "globals";

const baseConfig = js.configs.recommended;

export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "logs/**"],
  },
  {
    ...baseConfig,
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ...baseConfig.languageOptions,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.es2022,
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...baseConfig.rules,
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^ignored",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
