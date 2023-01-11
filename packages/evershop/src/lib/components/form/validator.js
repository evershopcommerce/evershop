const validator = {};
const rules = {
  email: {
    handler(value) {
      if (value === null || value === undefined || value === '') return true;
      // eslint-disable-next-line no-useless-escape
      const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(value).toLowerCase());
    },
    errorMessage: 'Invalid email'
  },
  number: {
    handler(value) {
      if (value === null || value === undefined || value === '') return true;
      return /^-?[0-9]+$/.test(value);
    },
    errorMessage: 'Invalid number'
  },
  notEmpty: {
    handler(value) {
      return (value && value.length !== 0);
    },
    errorMessage: 'This field can not be empty'
  },
  noWhiteSpace: {
    handler(value) {
      return !/\s/g.test(value);
    },
    errorMessage: 'No whitespace allowed'
  },
  noSpecialChar: {
    handler(value) {
      // eslint-disable-next-line no-useless-escape
      return !/[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(value);
    },
    errorMessage: 'No special character allowed'
  }
};

validator.addRule = (key, handler, message) => {
  rules[key] = {
    handler,
    errorMessage: message
  };
};

validator.removeRule = (key) => {
  delete rules[key];
};

validator.getRule = (key) => rules[key];

export { validator };
