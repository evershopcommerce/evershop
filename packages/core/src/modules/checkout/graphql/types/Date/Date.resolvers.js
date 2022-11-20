const dayjs = require('dayjs');

module.exports = {
  Date: {
    value: (raw, { }) => {
      return raw;
    },
    text: (raw, { }) => {
      return dayjs(raw).format('MMM D, YYYY');
    }
  }
}