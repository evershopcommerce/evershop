const { getContextValue } = require("../../graphql/services/buildContext")

module.exports.addTokenClaim = (claim, value) => {
  const tokenData = getContextValue("jwtWebToken");
  tokenData[claim] = value;
  return tokenData;
}