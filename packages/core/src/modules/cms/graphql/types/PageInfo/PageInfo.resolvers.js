const { get } = require("../../../../../lib/util/get")

module.exports = {
  Query: {
    pageInfo: (root, args, context) => { // TODO To be updated, API should be stateless
      return {
        url: get(context, "currentUrl"),
        title: get(context, "pageInfo.title", ""),
        description: get(context, "pageInfo.description", ""),
        keywords: get(context, "pageInfo.keywords", "")
      }
    }
  }
}