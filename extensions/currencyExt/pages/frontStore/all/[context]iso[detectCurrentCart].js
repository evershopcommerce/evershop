module.exports = (request, response, _, next) => {
    if (!!request.cookies?.isoCode === false) {
        response.setIsoCodeCookie('VND');
    }
    next();
};
