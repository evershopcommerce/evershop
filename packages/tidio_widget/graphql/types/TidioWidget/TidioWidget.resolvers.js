module.exports = {
  Query: {
    tidioWidget(_, { settings }) {
      return { text: settings.text };
    },
  },
};
