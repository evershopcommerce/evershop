module.exports = (err, req, response, stack, next) => {
    console.log(err);
    response.status(500).send(err.message);
};