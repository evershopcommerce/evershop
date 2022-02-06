/* eslint-disable no-unused-vars */
const path = require('path');
const fs = require('fs');
const { CONSTANTS } = require('../../../../../lib/helpers');

module.exports = (request, response) => {
  response.set('Content-Type', 'application/javascript');
  let buildPath = request.params[0] || null;
  if (request.isAdmin === true) {
    buildPath = `admin/${buildPath}`;
  } else {
    buildPath = `site/${buildPath}`;
  }
  if (!buildPath) {
    response.$body = '';
    return response;
  }
  return new Promise((resolve, reject) => {
    let timer = 0;
    // eslint-disable-next-line no-var
    var check = setInterval(() => {
      // We only wait for 1 min maximum for the bundle
      if (timer > 60000) {
        clearInterval(check);
        response.$body = 'timedout';
        resolve(1);
      }
      if (fs.existsSync(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/', buildPath, 'bundle.js'))) {
        clearInterval(check);
        fs.readFile(path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/', buildPath, 'bundle.js'), 'utf8', (err, data) => {
          if (err) throw err;
          response.$body = data;
          resolve(1);
        });
      }
      timer += 200;
    }, 200);
  });
};
