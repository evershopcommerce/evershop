const config = require('config');

module.exports = exports = function addressValidator(address) {
    if (typeof address === 'object' && address !== null) {
        let valid = false;
        let rules = config.get("customer.address");
    } else {
        return false;
    }
}