import { Application } from 'express';
import { warning } from '../../../../lib/log/logger.js';
import { Event } from '../watchHandler.js';
export function addComponent(app: Application, event: Event) {
  // Do nothing. Let ThemeWatcherPlugin handle this.
}
