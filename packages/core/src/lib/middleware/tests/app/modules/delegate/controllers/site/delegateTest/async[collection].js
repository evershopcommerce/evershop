const axios = require('axios');

module.exports = async (request, response, stack) => {
  const content = await axios.get('https://jsonplaceholder.typicode.com/todos/1');
};
