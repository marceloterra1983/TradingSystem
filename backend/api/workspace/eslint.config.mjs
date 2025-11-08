import js from "@eslint/js";

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
    },
    rules: {
      ...baseConfig.rules,
      "no-console": "off",
    },
  },
];
