import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.json({ inflate: false })(request, response, () => {
    bodyParser.urlencoded({ extended: true })(request, response, next);
  });
};
