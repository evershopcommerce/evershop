export const isBuildRequired = (route) => {
  if (route.isApi || ['staticAsset', 'adminStaticAsset'].includes(route.id)) {
    return false;
  } else {
    return true;
  }
};
