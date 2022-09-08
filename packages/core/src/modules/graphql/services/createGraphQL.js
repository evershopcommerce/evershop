const { graphql } = require('graphql');
const isDevelopmentMode = require('../../../lib/util/isDevelopmentMode');
const { context } = require('./buildContext');
var schema = require('./buildSchema');

module.exports.executeGraphql = async function executeGraphql(source, variables) {
  if (isDevelopmentMode()) {
    schema = require('./buildSchema');
  }

  return await graphql({
    schema, source, contextValue: context, variables
  });
}