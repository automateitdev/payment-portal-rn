const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Apply these rules to your source files
    rules: {
      // 1. Show warning for unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // 2. Show warning for explicit 'any' type
      "@typescript-eslint/no-explicit-any": "warn",
      // Disable base rule to avoid duplicate warnings
      "no-unused-vars": "off",
    },
  },
]);
