const { graphql } = require('graphql');
const context = require('./buildContext');
const schema = require('./buildSchema');

module.exports.executeGraphql = async function executeGraphql(source, variables) {
  return await graphql({
    schema, source, context, variables
  });
}