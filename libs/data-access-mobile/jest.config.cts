/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@behbehani-cpo/shared-types$':
      '<rootDir>/../../libs/shared/types/src/index.ts',
  },
  passWithNoTests: true,
};

module.exports = config;
