import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { createReactConfig } from '../eslint.config.base.js';

export default createReactConfig({
  tsconfigRootDir: import.meta.dirname,
  plugins: { react, reactHooks },
  ignores: ['*.config.ts', '*.config.*.ts'],
});
