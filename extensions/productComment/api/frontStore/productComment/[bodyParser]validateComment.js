module.exports = (request, response) => {
  const { body } = request;
  // Validate the comment data
  if (!body.product_id) {
    throw new Error('product Id is required');
  }

  if (!body.user_name) {
    throw new Error('User name is required');
  }

  if (!body.comment) {
    throw new Error('Comment is required');
  }
}