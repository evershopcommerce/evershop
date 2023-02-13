module.exports = async (request, response, delegates) => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(3000);
  undefined.b = 1;
};
