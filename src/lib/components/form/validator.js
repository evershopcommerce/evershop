let validator = {};
let rules = {
    email: {
        handler: function (value) {
            let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(String(value).toLowerCase());
        },
        errorMessage: "Invalid email"
    },
    number: {
        handler: function (value) {
            return /^[0-9]+$/.test(value)
        },
        errorMessage: "Invalid number"
    },
    notEmpty: {
        handler: function (value) {
            return (value && 0 !== value.length);
        },
        errorMessage: "This field can not be empty"
    },
    noWhiteSpace: {
        handler: function (value) {

        },
        errorMessage: "No whitespace allowed"
    },
    noSpecialChar: {
        handler: function (value) {

        },
        errorMessage: "No special character allowed"
    }
};

validator.addRule = function (key, handler, message) {
    rules[key] = {
        handler: handler,
        errorMessage: message
    }
};

validator.removeRule = function (key) {
    delete rules[key];
};

validator.getRule = function (key) {
    return rules[key];
};

export { validator }