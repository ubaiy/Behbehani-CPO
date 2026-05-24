module.exports = {
  displayName: '@behbehani-cpo/api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  // Loads BEFORE any module import — ensures env vars are set before
  // config/env.ts runs its EnvSchema.parse(process.env) at module scope.
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  // OTP/session tests involve bcrypt hashing (rounds=8) + async I/O.
  testTimeout: 10000,
};
