export default {
  testEnvironment: "node",
  moduleNameMapper: {
    '^@storefront/postgres-query-builder$': '<rootDir>/packages/postgres-query-builder/dist/index.js',
    '^@storefront/postgres-query-builder/(.*)$': '<rootDir>/packages/postgres-query-builder/dist/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@storefront)/)"
  ],
  testMatch: ["**/dist/**/tests/**/unit/**/*.test.[jt]s"],
  modulePathIgnorePatterns: ["<rootDir>/packages/storefront/src/"]
};
