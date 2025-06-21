import { registerHooks } from 'node:module';
import { resolve } from './hooks.js';

registerHooks({
  resolve: resolve
});
