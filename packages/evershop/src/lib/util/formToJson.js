/* eslint-disable no-multi-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-const */
module.exports = exports = {};

function update(data, keys, value) {
  if (keys.length === 0) {
    // Leaf node
    return value;
  }

  let key = keys.shift();
  if (!key) {
    data = data || [];
    if (Array.isArray(data)) {
      key = data.length;
    }
  }

  // Try converting key to a numeric value
  const index = +key;
  if (!Number.isNaN(index)) {
    // We have a numeric index, make data a numeric array
    // This will not work if this is a associative array
    // with numeric keys
    data = data || [];
    key = index;
  }

  // If none of the above matched, we have an associative array
  data = data || {};

  const val = update(data[key], keys, value);
  data[key] = val;

  return data;
}

exports.serializeForm = function serializeForm(formDataEntries, dataFilter) {
  const data = Array.from(formDataEntries).reduce((data, [field, value]) => {
    // eslint-disable-next-line no-useless-escape,no-unused-vars
    let [_, prefix, keys] = field.match(/^([^\[]+)((?:\[[^\]]*\])*)/);

    if (keys) {
      keys = Array.from(keys.matchAll(/\[([^\]]*)\]/g), (m) => m[1]);
      value = update(data[prefix], keys, value);
    }
    data[prefix] = value;
    return data;
  }, {});

  // Check if dataFilter is a function
  if (typeof dataFilter === 'function') {
    return dataFilter(data);
  } else {
    return data;
  }
};
