const path = require('path');
const fs = require('fs');
const { getCoreModules } = require('@evershop/evershop/bin/lib/loadModules');
const { getEnabledExtensions } = require('@evershop/evershop/bin/extension');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');

function loadModuleSubscribers(modulePath) {
  const subscribers = [];
  const subscribersDir = path.join(modulePath, 'subscribers');

  if (!fs.existsSync(subscribersDir)) {
    return subscribers;
  }

  const eventDirs = fs
    .readdirSync(subscribersDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  eventDirs.forEach((eventName) => {
    const eventSubscribersDir = path.join(subscribersDir, eventName);

    // get only .js files
    const files = fs
      .readdirSync(eventSubscribersDir, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js'))
      .map((dirent) => dirent.name);

    files.forEach((file) => {
      const subscriberPath = path.join(eventSubscribersDir, file);
      const subscriberFn = require(subscriberPath);

      subscribers.push({
        event: eventName,
        subscriber: subscriberFn
      });
    });
  });

  return subscribers;
}

module.exports.loadSubscribers = function loadSubscribers() {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];
  const subscribers = [];
  /** Loading subscriber  */
  modules.forEach((module) => {
    try {
      // Load routes
      subscribers.push(...loadModuleSubscribers(module.path));
    } catch (e) {
      debug('critical', e);
      process.exit(0);
    }
  });
  return subscribers;
};
