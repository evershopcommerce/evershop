import { Application } from 'express';
import { warning } from '../../../../lib/index.js';
import { Event } from '../watchHandler.js';
import { justATouch } from './touch.js';

export function addComponent(app: Application, event: Event) {
  try {
    justATouch();
  } catch (error) {
    warning(
      `Failed to add component from ${event.path}: ${error.message}. Skipping.`
    );
  }
}
