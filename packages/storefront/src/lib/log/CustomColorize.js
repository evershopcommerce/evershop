// Extend the default winston colorize format and add color to the stack trace
import { LEVEL } from 'triple-beam';
import { format } from 'winston';

const { colorize } = format;

class CustomColorize extends colorize.Colorizer {
  constructor(opts = {}) {
    super(opts);
  }

  transform(info, opts) {
    super.transform(info, opts);
    if (info.stack) {
      info.stack = this.colorize(info[LEVEL], info.level, info.stack);
    }
    return info;
  }
}

export default (opts) => new CustomColorize(opts);
