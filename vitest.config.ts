import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts', 'src/cli/', 'src/rules/'],
      thresholds: {
        lines: 20,
        functions: 25,
        branches: 75,
        statements: 20,
      },
    },
    mockReset: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
  },
});