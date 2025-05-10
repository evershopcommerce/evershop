#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { argv } = yargs(hideBin(process.argv));
const command = argv._[0];
try {
  if (command === 'build') {
    await import('./build/index.js');
  } else if (command === 'dev') {
    await import('./dev/index.js');
  } else if (command === 'start') {
    await import('./start/index.js');
  } else if (command === 'install') {
    await import('./install/index.js');
  } else if (command === 'user:create') {
    await import('./user/create.js');
  } else if (command === 'user:changePassword') {
    await import('./user/changePassword.js');
  } else {
    throw new Error('Invalid command');
  }
} catch (e) {
  import('../lib/log/logger.js').then((module) => {
    module.error(e);
  });
}
process.on('uncaughtException', function (exception) {
  import('../lib/log/logger.js').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  import('../lib/log/logger.js').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});
