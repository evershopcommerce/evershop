#!/usr/bin/env node
process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { argv }: any = yargs(hideBin(process.argv));
const command = argv._[0];
try {
  if (command === 'build') {
    process.env.NODE_ENV = 'production';
    import('./build/index').then((module) => module.default());
  } else if (command === 'dev') {
    process.env.NODE_ENV = 'development';
    import('./dev/index').then((module) => module.default());
  } else if (command === 'start') {
    process.env.NODE_ENV = 'production';
    import('./start/index')
      .then((module) => module.default(() => { }))
      .catch((e) => {
        console.error(e);
      });
  } else if (command === 'install') {
    import('./install/index').then((module) => module.default());
  } else if (command === 'user:create') {
    import('./user/create.js').then((module) => module.default());
  } else if (command === 'user:changePassword') {
    import('./user/changePassword').then((module) => module.default());
  } else {
    throw new Error('Invalid command');
  }
} catch (e) {
  import('@evershop/evershop/src/lib/log/logger').then((module) => {
    module.error(e);
  });
}
process.on('uncaughtException', function (exception) {
  import('@evershop/evershop/src/lib/log/logger').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  console.log('11111', p);
  import('@evershop/evershop/src/lib/log/logger').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});
