const axios = require('axios');

module.exports.getGoogleAuthToken = async (
  code,
  client_id,
  client_secret,
  redirect_uri
) => {
  const url = `https://oauth2.googleapis.com/token?code=${code}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${redirect_uri}&grant_type=authorization_code`;
  // Using axios to get the access token

  const response = await axios.post(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  const { data } = response;

  return data;
};
