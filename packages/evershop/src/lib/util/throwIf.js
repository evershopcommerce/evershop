function throwIf(condition, message) {
  if (condition) {
    throw new Error(message);
  }
}

module.exports = exports = throwIf;
