module.exports = function GraphqlAPILoader(source) {
  // Get options
  const options = this.getOptions();
  const isAdmin = options.isAdmin || false;
  // Replace the specified code with an empty string
  if (isAdmin) {
    const newSource = source.replace(
      "url: '/api/graphql",
      "url: '/api/admin/graphql"
    );
    return newSource;
  } else {
    return source;
  }
};
