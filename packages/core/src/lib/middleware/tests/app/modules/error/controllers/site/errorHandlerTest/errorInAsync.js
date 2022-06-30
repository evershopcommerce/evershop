const axios = require('axios');

module.exports = async (request, response, stack) => {
  await axios.get('https://deelay.me/500/https://picsum.photos/200/300');
  undefined.b = 1;
};
