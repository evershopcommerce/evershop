const { get } = require("../../../../../lib/util/get")

module.exports = {
  Query: {
    pageInfo: (root, args, context) => {
      return {
        title: get(context, "pageInfo.title", ""),
        description: get(context, "pageInfo.description", ""),
        keywords: get(context, "pageInfo.keywords", "")
      }
    }
  }
}