const dayjs = require('dayjs');

module.exports = {
  Date: {
    value: (raw) => raw,
    text: (raw) => dayjs(raw).format('MMM D, YYYY')
  }
};
