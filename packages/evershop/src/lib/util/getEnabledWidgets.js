const isResolvable = require('is-resolvable');
const { getConfig } = require('./getConfig');
const { generateComponentKey } = require('../webpack/util/keyGenerator');

module.exports = exports = {};

exports.getEnabledWidgets = function getEnabledWidgets() {
  const configuredWidgets = getConfig('widgets', {});
  const widgets = [];
  Object.keys(configuredWidgets).forEach((widget) => {
    // Make sure the enabled = true and the component path is exist
    const { setting_component } = configuredWidgets[widget];
    const { component } = configuredWidgets[widget];
    // Make sure path is existed and it is a jsx file
    if (!isResolvable(setting_component)) {
      throw new Error(
        `Widget ${widget} is not configured correctly. The setting_component is not existed or not a jsx file`
      );
    } else if (!isResolvable(component)) {
      throw new Error(
        `Widget ${widget} is not configured correctly. The component is not existed or not a jsx file`
      );
    }
    if (configuredWidgets[widget].enabled === true) {
      widgets.push({
        ...configuredWidgets[widget],
        type: widget,
        settingComponentKey: generateComponentKey(setting_component),
        componentKey: generateComponentKey(component)
      });
    }
  });
  return widgets;
};
