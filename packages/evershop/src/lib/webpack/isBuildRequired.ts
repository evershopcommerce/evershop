import { Route } from '../../types/route.js';

export const isBuildRequired = (route: Route) => {
  if (route?.isApi || ['staticAsset', 'adminStaticAsset'].includes(route.id)) {
    return false;
  } else {
    return true;
  }
};
