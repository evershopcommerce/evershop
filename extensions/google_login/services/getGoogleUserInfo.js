const axios = require('axios');

module.exports.getGoogleUserInfo = async (access_token, id_token) => {
  const url = `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${id_token}`
    }
  });
  const { data } = response;
  return data;
};
