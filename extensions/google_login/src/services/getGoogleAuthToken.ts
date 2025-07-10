import axios from "axios";

export const getGoogleAuthToken = async (
  code: string,
  client_id: string,
  client_secret: string,
  redirect_uri: string
) => {
  const url = `https://oauth2.googleapis.com/token?code=${code}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${redirect_uri}&grant_type=authorization_code`;
  // Using axios to get the access token

  const response = await axios.post(url, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const { data } = response;

  return data;
};
