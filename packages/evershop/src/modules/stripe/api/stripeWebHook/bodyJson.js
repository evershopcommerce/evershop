import bodyParser from 'body-parser';

export default (request, response, delegate, next) => {
  bodyParser.raw({ type: '*/*' })(request, response, next);
};
