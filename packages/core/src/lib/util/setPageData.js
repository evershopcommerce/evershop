/* eslint-disable no-param-reassign */
const { app } = require('../../../bin/serve/app');

/**
 * This function set a value to the app
 *
 * @param   {string}  name
 * @param   {data}  data
 *
 */
function setPageData(name, value) {
  const pageData = app.get('pageData') || {};
  pageData[name] = value;
  app.set('pageData', pageData);
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { setPageData };
