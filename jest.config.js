export default {
  testEnvironment: "node",
  moduleNameMapper: {
    '^@evershop/postgres-query-builder$': '<rootDir>/packages/postgres-query-builder/dist/index.js',
    '^@evershop/postgres-query-builder/(.*)$': '<rootDir>/packages/postgres-query-builder/dist/$1',
    '^@components/(.*)\\.jsx$': '<rootDir>/packages/evershop/dist/components/$1.js',
    '^@components/(.*)$': '<rootDir>/packages/evershop/dist/components/$1',
    '\\.(css|scss)$': '<rootDir>/tests/styleStub.cjs',
    '^(\\.{1,2}/.*)\\.jsx?$': '$1'
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@evershop)/)"
  ],
  testMatch: ["**/dist/**/tests/**/unit/**/*.test.[jt]s"],
  modulePathIgnorePatterns: ["<rootDir>/packages/evershop/src/"]
};
