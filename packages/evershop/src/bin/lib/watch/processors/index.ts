import { Application } from 'express';
import { Effect } from '../effect.js';
import { addAdminRoute } from './addAdminRoute.js';
import { addApiRoute } from './addApiRoute.js';
import { addComponent } from './addComponent.js';
import { addFrontStoreRoute } from './addFrontStoreRoute.js';
import { addMiddleware } from './addMiddleware.js';
import { deleteARoute } from './deleteARoute.js';
import { removeMiddleware } from './removeMiddleware.js';
import { restartCronJob } from './restartCronJob.js';
import { restartSubscriber } from './restartSubscriber.js';
import { updateAdminRoute } from './updateAdminRoute.js';
import { updateApiRoute } from './updateApiRoute.js';
import { updateFrontStoreRoute } from './updateFrontStoreRoute.js';

export type Processor = {
  [key in Effect]?: (app: Application, event: any) => void;
};

export const processors: Processor = {
  add_api_route: addApiRoute,
  update_api_route: updateApiRoute,
  add_front_store_route: addFrontStoreRoute,
  update_front_store_route: updateFrontStoreRoute,
  add_admin_route: addAdminRoute,
  update_admin_route: updateAdminRoute,
  remove_api_route: deleteARoute,
  remove_admin_route: deleteARoute,
  remove_front_store_route: deleteARoute,
  add_middleware: addMiddleware,
  remove_middleware: removeMiddleware,
  update_middleware: () => {},
  update_component: () => {
    // No operation for update_component, as it is handled by the compiler}
  },
  add_component: addComponent,
  update_graphql: () => {},
  restart_cronjob: () => {
    restartCronJob();
  },
  restart_event: () => {
    restartSubscriber();
  }
};
