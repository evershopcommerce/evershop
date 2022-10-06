const jest = require('jest-mock');
const axios = require('axios');

module.exports = jest.fn(async (request, response, delegates, next) => {
  try {
    await axios.get('https://deelay.me/5000/https://picsum.photos/200/300');
    undefined.a = 1;
    next();
  } catch (e) {
    next(e);
  }
})
