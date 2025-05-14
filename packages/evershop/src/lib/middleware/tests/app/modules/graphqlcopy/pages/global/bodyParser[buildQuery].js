import bodyParser from 'body-parser';

export default (request, response, stack, next) => {
  bodyParser.json({ inflate: false })(request, response, () => {
    bodyParser.urlencoded({ extended: true })(request, response, next);
  });
};
