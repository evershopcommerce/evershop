const path = require('path');

module.exports.validatePath = function validatePath(root, requestedPath) {
  if (requestedPath === '') {
    return true;
  }
  const normalizedPath = path.normalize(requestedPath);
  const joinedPath = path.join(root, normalizedPath);
  // eslint-disable-next-line no-useless-escape
  const cleanPath = requestedPath.replace(/[\/\\]/g, path.sep);
  if (joinedPath.startsWith(root) && cleanPath === normalizedPath) {
    return true;
  }

  return false;
};
