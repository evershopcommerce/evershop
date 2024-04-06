// Extend the default winston colorize format and add color to the stack trace
const { format } = require('winston');
const { LEVEL } = require('triple-beam');

const { colorize } = format;

class CustomColorize extends colorize.Colorizer {
  constructor(opts = {}) {
    super(opts);
  }

  transform(info, opts) {
    super.transform(info, opts);
    if (info.stack) {
      // eslint-disable-next-line no-param-reassign
      info.stack = this.colorize(info[LEVEL], info.level, info.stack);
    }
    return info;
  }
}

module.exports = (opts) => new CustomColorize(opts);
