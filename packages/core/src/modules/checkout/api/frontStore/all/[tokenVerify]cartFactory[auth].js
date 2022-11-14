const { CartFactory } = require("../../../services/cart/CartFactory")

module.exports = (request, response) => {
  CartFactory.init(request, response);
}