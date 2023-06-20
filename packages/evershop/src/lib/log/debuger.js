// Define logger levels
const levels = {
  critical: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[34m'
};

// Define logger function
function debug(level, message) {
  if (!process.argv.includes('--debug')) {
    return; // Do not output message to console or file
  }
  const color = levels[level] || '';

  // If message is an exception object, include the stack trace
  let logMessage = `[debug] ${message}`;
  if (message instanceof Error) {
    logMessage += `\n${message.stack}`;
  }

  // If message is added to a group, store it in the group
  if (this.group && Array.isArray(this.group.messages)) {
    this.group.messages.push(logMessage);
    return; // Do not output message to console or file
  }

  console.log(`${color}${logMessage}\x1b[0m`);
}

module.exports.debug = debug;
