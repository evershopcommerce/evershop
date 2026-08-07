export default async (request, response) => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(3000);
  undefined.b = 1;
};
