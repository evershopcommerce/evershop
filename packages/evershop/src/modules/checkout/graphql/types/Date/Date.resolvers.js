import dayjs from 'dayjs';

export default {
  Date: {
    value: (raw) => raw,
    text: (raw) => dayjs(raw).format('MMM D, YYYY')
  }
};
