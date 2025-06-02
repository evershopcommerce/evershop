import bodyParser from 'body-parser';

export default (request, response, stack, next) => {
  bodyParser.json()(request, response, next);
};
