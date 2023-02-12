const axios = require('axios');

module.exports = async (request, response, delegates, next) => {
  const content = await axios.get(
    'https://jsonplaceholder.typicode.com/todos/1'
  );
  next();
};
