import path from 'path';

export function validatePath(root, requestedPath) {
  if (requestedPath === '') {
    return true;
  }
  const normalizedPath = path.normalize(requestedPath);
  const joinedPath = path.join(root, normalizedPath);

  const cleanPath = requestedPath.replace(/[\/\\]/g, path.sep);
  if (joinedPath.startsWith(root) && cleanPath === normalizedPath) {
    return true;
  }

  return false;
}
