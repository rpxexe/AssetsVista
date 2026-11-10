import js from "@eslint/js";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "graphify-out/**",
      ".agents/**",
      "out/**",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",
    },
  },
];
