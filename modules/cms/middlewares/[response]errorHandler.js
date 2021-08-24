module.exports = (err, req, response, stack, next) => {
    //console.log(err);
    console.log("express catched error", "background: #222; color: red")
    response.status(500).send(err.message);
};