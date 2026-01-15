import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { createViteReactConfig } from '../eslint.config.base.js';

export default createViteReactConfig({
  tsconfigRootDir: import.meta.dirname,
  plugins: { reactHooks, reactRefresh },
  globals: globals.browser,
});
