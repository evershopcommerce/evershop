import axios from 'axios';

export default async (request, response) => {
  const content = await axios.get(
    'https://jsonplaceholder.typicode.com/todos/1'
  );
};
