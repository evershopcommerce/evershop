/* eslint-disable no-param-reassign */
const winston = require('winston');

const { errors } = winston.format;
const customColorize = require('./CustomColorize');
const isDevelopmentMode = require('../util/isDevelopmentMode');
const { getEnv } = require('../util/getEnv');
const { getValueSync, addProcessor } = require('../util/registry');

const isDebugging = isDevelopmentMode() || process.argv.includes('--debug');
const format = winston.format.combine(
  errors({ stack: true }),
  customColorize({
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'blue',
      verbose: 'cyan',
      debug: 'magenta',
      silly: 'gray'
    },
    level: false,
    message: true
  }),
  winston.format.printf(({ level, message, stack }) => {
    let icon;
    switch (level) {
      case 'error':
        icon = '❌'; // Error icon
        break;
      case 'warn':
        icon = '⚠️ '; // Warning icon
        break;
      case 'info':
        icon = 'ℹ️'; // Info icon
        break;
      case 'http':
        icon = '🌐'; // HTTP icon
        break;
      case 'verbose':
        icon = '🔍'; // Verbose icon
        break;
      case 'debug':
        icon = '🐛'; // Debug icon
        break;
      case 'silly':
        icon = '🤪'; // Silly icon
        break;
      default:
        icon = '';
        break;
    }
    // Now apply color to the icon and level
    switch (level) {
      case 'error':
        level = `\x1b[31m${level}\x1b[0m`; // Red color
        icon = `\x1b[31m${icon}\x1b[0m`; // Red color
        break;
      case 'warn':
        level = `\x1b[33m${level}\x1b[0m`; // Yellow color
        icon = `\x1b[33m${icon}\x1b[0m`; // Yellow color
        break;
      case 'info':
        level = `\x1b[32m${level}\x1b[0m`; // Green color
        icon = `\x1b[32m${icon}\x1b[0m`; // Green color
        break;
      case 'http':
        level = `\x1b[34m${level}\x1b[0m`; // Blue color
        icon = `\x1b[34m${icon}\x1b[0m`; // Blue color
        break;
      case 'verbose':
        level = `\x1b[36m${level}\x1b[0m`; // Cyan color
        icon = `\x1b[36m${icon}\x1b[0m`; // Cyan color
        break;
      case 'debug':
        level = `\x1b[35m${level}\x1b[0m`; // Magenta color
        icon = `\x1b[35m${icon}\x1b[0m`; // Magenta color
        break;
      case 'silly':
        level = `\x1b[37m${level}\x1b[0m`; // Gray color
        icon = `\x1b[37m${icon}\x1b[0m`; // Gray color
        break;
      default:
        break;
    }
    if (stack) {
      message = `${message}\n${stack}`;
    }
    return `${icon} ${level}: \n${message}`;
  })
);
const consoleTransport = new winston.transports.Console();
const logFile = getEnv('LOG_FILE', undefined);
// Default transports
const DEFAULT_CONFIG = {
  level: isDebugging ? 'silly' : getEnv('LOGGER_LEVEL', 'warn'),
  format,
  // By default, log to console
  transports:
    isDebugging || !logFile
      ? [consoleTransport]
      : [new winston.transports.File({ filename: logFile })],
  exceptionHandlers:
    isDebugging || !logFile
      ? [consoleTransport]
      : [new winston.transports.File({ filename: logFile })]
};

function createLogger() {
  return getValueSync('logger', null, { isDebugging });
}

// Define logger function
function debug(message) {
  const logger = createLogger();
  logger.debug(message);
}

function error(e) {
  const logger = createLogger();
  logger.error(e);
}

function warning(message) {
  const logger = createLogger();
  logger.warn(message);
}

function info(message) {
  const logger = createLogger();
  logger.info(message);
}

function success(message) {
  const logger = createLogger();
  logger.info(message);
}

addProcessor(
  'logger',
  () => {
    const config = getValueSync('logger_configuration', DEFAULT_CONFIG, {
      isDebugging
    });
    return winston.createLogger(config);
  },
  0
);

// eslint-disable-next-line no-multi-assign
module.exports = exports = {
  success,
  info,
  warning,
  error,
  debug
};
