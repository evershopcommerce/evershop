const isEqual = require('react-fast-compare');

class Registry {
  values = {};

  async get(name, initValue, context, validator) {
    if (this.values[name]) {
      // If the initValue and the context are identical, return the cached value. Skip the processors
      if (
        isEqual(initValue, this.values[name].initValue) &&
        isEqual(this.values[name].context, context)
      ) {
        return this.values[name].value;
      }
    }

    // Cache the initValue and the context
    this.values[name] = this.values[name] || {};
    this.values[name].initValue = initValue;
    this.values[name].context = context;

    // If there is no processor, return the init value
    if (!this.values[name].processors) {
      this.values[name].value = initValue;
      return initValue;
    }

    const { processors } = this.values[name];
    // Call the list of processors, returned value will be passed to the next processor. Start with the init value
    let value = initValue;
    for (let i = 0; i < processors.length; i += 1) {
      const { callback } = processors[i];
      value = await callback.call(context, value);
      // Validate the value if the validator is provided and it is a function
      if (typeof validator === 'function') {
        const validateResult = validator(value);
        if (validateResult !== true) {
          throw new Error(`Value ${name} is invalid: ${validateResult}`);
        }
      }
    }

    // Cache the value
    this.values[name].value = value;
    return value;
  }

  getSync(name, initValue, context, validator) {
    const validateFunc = (value) => {
      // Check if value is a promise
      if (typeof value === 'object' && typeof value.then === 'function') {
        throw new Error(
          `The 'getSync' function does not support async processor. Please use 'get' function instead`
        );
      } else if (typeof validator === 'function') {
        return validator(value);
      } else {
        return true;
      }
    };

    if (this.values[name]) {
      // If the initValue and the context are identical, return the cached value. Skip the processors
      if (
        isEqual(initValue, this.values[name].initValue) &&
        isEqual(this.values[name].context, context)
      ) {
        return this.values[name].value;
      }
    }

    // Cache the initValue and the context
    this.values[name] = this.values[name] || {};
    this.values[name].initValue = initValue;
    this.values[name].context = context;

    // If there is no processor, return the init value
    if (!this.values[name].processors) {
      this.values[name].value = initValue;
      return initValue;
    }

    const { processors } = this.values[name];
    // Call the list of processors, returned value will be passed to the next processor. Start with the init value
    let value = initValue;
    for (let i = 0; i < processors.length; i += 1) {
      const { callback } = processors[i];
      value = callback.call(context, value);
      // Validate the value if the validator is provided and it is a function
      const validateResult = validateFunc(value);
      if (validateResult !== true) {
        throw new Error(`Value ${name} is invalid`);
      }
    }

    // Cache the value
    this.values[name].value = value;
    return value;
  }

  addProcessor(name, callback, priority) {
    if (typeof priority === 'undefined') {
      // eslint-disable-next-line no-param-reassign
      priority = 10;
    }
    // Throw error if priority is not a number
    if (typeof priority !== 'number') {
      throw new Error('Priority must be a number');
    }

    // Throw error if callback is not a function or async function
    if (
      typeof callback !== 'function' &&
      callback.constructor.name !== 'AsyncFunction'
    ) {
      throw new Error('Callback must be a function');
    }

    if (!this.values[name]) {
      this.values[name] = {
        processors: []
      };
    }
    this.values[name].processors = this.values[name].processors || [];
    // Add the callback to the processors, sort by priority
    const { processors } = this.values[name];
    processors.push({
      callback,
      priority
    });
    processors.sort((a, b) => a.priority - b.priority);
  }

  getProcessors(name) {
    if (!this.values[name]) {
      throw new Error(`The value ${name} is not registered`);
    }
    return this.values[name].processors || [];
  }
}

const registry = new Registry();

module.exports = {
  /**
   * @param {String} name
   * @param {any} initValue
   * @param {Object} context
   * @param {Function} validator
   */
  async getValue(name, initValue, context, validator) {
    const val = await registry.get(name, initValue, context, validator);
    return val;
  },

  /**
   * @param {String} name
   * @param {any} initValue
   * @param {Object} context
   * @param {Function} validator
   */
  getValueSync(name, initValue, context, validator) {
    const val = registry.getSync(name, initValue, context, validator);
    return val;
  },

  addProcessor(name, callback, priority) {
    return registry.addProcessor(name, callback, priority);
  },

  getProcessors(name) {
    return registry.getProcessors(name);
  }
};
