// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  const { body } = request;
  const { email, full_name, password } = body;

  // Check if email is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return response.status(400).json({
      success: false,
      message: 'Invalid email'
    });
  }

  // Check if full_name is not empty
  if (!full_name) {
    return response.status(400).json({
      success: false,
      message: 'Invalid full_name'
    });
  }

  // Check if password is not empty
  if (!password) {
    return response.status(400).json({
      success: false,
      message: 'Invalid password'
    });
  }
};
