const fs = require('fs');
const { join } = require('path');
const { getConfig } = require('../../util/getConfig');
const { CONSTANTS } = require('../../helpers');

module.exports.getTailwindConfig = function getTailwindConfig(route) {
  const defaultTailwindConfig = route.isAdmin
    ? require('@evershop/evershop/src/modules/cms/services/tailwind.admin.config.js')
    : require('@evershop/evershop/src/modules/cms/services/tailwind.frontStore.config.js');

  let tailwindConfig = {};
  if (!route.isAdmin) {
    // Get the current theme
    const theme = getConfig('system.theme');
    if (
      theme &&
      fs.existsSync(join(CONSTANTS.THEMEPATH, theme, 'tailwind.config.js'))
    ) {
      tailwindConfig = require(join(
        CONSTANTS.THEMEPATH,
        theme,
        'tailwind.config.js'
      ));
    }
  }
  // Merge defaultTailwindConfig with tailwindConfigJs
  const mergedTailwindConfig = Object.assign(
    defaultTailwindConfig,
    tailwindConfig
  );

  return mergedTailwindConfig;
};
