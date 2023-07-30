module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/dist/**/*",
    "/build/**/*", // Ignore built files.
    "/node_modules/**/*",
    ".eslintrc.cjs",
    "jest.config.cjs",
    "bundle.mjs",
    "webpack.config.cjs",
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    // eslint-disable-next-line quote-props
    quotes: ["error", "double"],
    "import/no-unresolved": 0,
    "require-jsdoc": 0,
  },
};
