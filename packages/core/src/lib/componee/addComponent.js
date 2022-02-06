const { assign } = require('../util/assign');
const { components } = require('./components');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.addComponent = function addComponent(scope, route, id, areaId, source, props, sortOrder) {
  // TODO: validate the arguments, for now let's assume they are valid
  const data = {
    [scope]: {
      [route]: {
        [areaId]: {
          [id]: {
            id,
            source,
            props,
            sortOrder
          }
        }
      }
    }
  };
  assign(components, data);
};
