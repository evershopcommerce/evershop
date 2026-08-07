import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};
