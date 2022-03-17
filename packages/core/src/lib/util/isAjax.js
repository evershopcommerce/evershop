/**
 * Get the value base on the path
 *
 * @param   {object}  request   The request object
 *
 * @return  {boolean}
 */
function isAjax(request) {
  return request.get('X-Requested-With') === 'XMLHttpRequest';
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { isAjax };
