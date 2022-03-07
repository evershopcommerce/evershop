const { app } = require('../../../bin/serve/app');

export function getPageData(path) {
  const pageData = app.get('pageData');
  console.log(pageData);
  return pageData[path];
}
