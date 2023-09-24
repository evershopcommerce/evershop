function generateRandomToken(length) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }

  return token;
}

const aRandomToken = generateRandomToken(52);

module.exports.aRandomToken = aRandomToken;
module.exports.generateRandomToken = generateRandomToken;
