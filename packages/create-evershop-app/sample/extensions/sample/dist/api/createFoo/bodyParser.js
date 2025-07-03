import bodyParser from 'body-parser';
export default (request, response, next) => {
    bodyParser.json({ inflate: false })(request, response, next);
};
//# sourceMappingURL=bodyParser.js.map