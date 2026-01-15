import { createNodeConfig } from '../eslint.config.base.js';

export default createNodeConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: ['**/*.test.ts', '*.config.ts'],
});
