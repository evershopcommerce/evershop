/* eslint-disable no-param-reassign */
class Factory {
  static processors = {};

  static values = {};

  static raws = [];

  static async create(name, value) {
    // If the value is already created, throw an error
    if (this.values[name]) {
      throw new Error(
        `Value ${name} is already created. Please use another name.`
      );
    }

    this.values[name] = true;

    if (!this.processors[name]) {
      return value;
    }
    // Check if we need to force raw value
    if (this.raws && this.raws.includes(name)) {
      return value;
    }

    // Sort the processors by priority
    this.processors[name].sort((a, b) => a.priority - b.priority);

    const processors = this.processors[name];
    // Call the list of processors, returned value will be passed to the next processor. Start with the value
    for (let i = 0; i < processors.length; i += 1) {
      const { callback } = processors[i];
      value = await callback(value);
    }

    return value;
  }

  static addProcessor(name, callback, priority) {
    if (typeof priority === 'undefined') {
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

    if (!this.processors[name]) {
      this.processors[name] = [];
    }
    // Add the callback to the processors, respect the priority
    this.processors[name].push({
      callback,
      priority
    });
  }

  // This method must be called before the value is created
  static forceRaw(name) {
    this.raws = this.raws || [];
    this.raws.push(name);
  }
}

module.exports = {
  createValue(name, value) {
    return Factory.create(name, value);
  },
  addProcessor(name, callback, priority) {
    return Factory.addProcessor(name, callback, priority);
  },
  forceRaw(name) {
    return Factory.forceRaw(name);
  }
};
