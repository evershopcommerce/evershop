const { green, red, blue, yellow, white } = require('kleur');

// Define logger function
function debug(level, message) {
  if (!process.argv.includes('--debug')) {
    return; // Do not output message to console or file
  }
  let logMessage = ``;
  let textMessage = `${message}`;
  // If message is an exception object, include the stack trace
  if (message instanceof Error) {
    textMessage = `${message.message}\n${message.stack}`;
  }
  // Switch color based on level
  switch (level) {
    case 'critical':
      logMessage += red(`[debug] ❌ ${textMessage}`);
      break;
    case 'warning':
      logMessage += yellow(`[debug] ⚠️ ${textMessage}`);
      break;
    case 'info':
      logMessage += blue(`[debug] ℹ️ ${textMessage}`);
      break;
    case 'success':
      logMessage += green(`[debug] ✅ ${textMessage}`);
      break;
    default:
      logMessage += white(`[debug] - ${textMessage}`);
      break;
  }

  // If message is added to a group, store it in the group
  if (this.group && Array.isArray(this.group.messages)) {
    this.group.messages.push(logMessage);
    return; // Do not output message to console or file
  }

  // eslint-disable-next-line no-console
  console.log(logMessage);
}

function error(e) {
  // Check if e is a string message
  if (typeof e === 'string') {
    // eslint-disable-next-line no-console
    console.log(`\n❌ ${red(e)}\n`);
  } else if (e instanceof Error) {
    // eslint-disable-next-line no-console
    console.log(`\n❌ ${red(e.stack)}`);
  } else {
    throw new Error('Error message must be a string or an Error object');
  }
}

function warning(message) {
  if (typeof message === 'string' || typeof message === 'number') {
    // eslint-disable-next-line no-console
    console.log(`\n⚠️  ${yellow(message)}\n`);
  } else {
    throw new Error('Warning message must be a string or number');
  }
}

function info(message) {
  if (typeof message === 'string' || typeof message === 'number') {
    // eslint-disable-next-line no-console
    console.log(`\nℹ️ ${blue(message)}\n`);
  } else {
    throw new Error('Warning message must be a string or number');
  }
}

function success(message) {
  if (typeof message === 'string' || typeof message === 'number') {
    // eslint-disable-next-line no-console
    console.log(`\n✅ ${green(message)}\n`);
  } else {
    throw new Error('Warning message must be a string or number');
  }
}

module.exports.success = success;
module.exports.info = info;
module.exports.warning = warning;
module.exports.error = error;
module.exports.debug = debug;
