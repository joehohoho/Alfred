import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Unit tests run in plain Node. Integration tests that need a DOM opt in
    // with an `@vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
