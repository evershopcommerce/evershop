const axios = require('axios');

module.exports = async function graphql(request, response, stack, next) {
  const { method, url, body } = request;
  const { query, variables } = body;

  const { data } = await axios.post('https://swapi-graphql.netlify.app/.netlify/functions/index', {
    query,
    variables,
  });

  response.json(data);
}