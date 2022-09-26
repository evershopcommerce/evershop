const { setContextValue } = require("../../../../graphql/services/buildContext")

module.exports = (request, response) => {
  setContextValue('pageInfo', {
    title: "Dashboard",
    description: "dashboard"
  })
}