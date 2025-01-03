/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash.isequalwith');
const { error } = require('@evershop/evershop/src/lib/log/logger');

module.exports.DataObject = class DataObject {
  #fields;

  #data = {};

  #errors = {};

  #triggeredField;

  #requestedValue;

  constructor(fields, initialData = {}) {
    this.#fields = fields;
    this.#data = initialData;
    this.isBuilding = false;
  }

  // Build the field value. This function will be called when the field value is changed
  // If error is thrown, all changes will be rollback
  async build() {
    const _this = this;

    // Keep current values for rollback
    const values = { ...this.#data };

    try {
      this.isBuilding = true;
      this.#errors = {};

      for (let i = 0; i < this.#fields.length; i += 1) {
        const field = this.#fields[i];
        let value =
          field.key === this.#triggeredField
            ? this.#requestedValue
            : this.#data[field.key];
        // Execute the list of resolvers
        for (let j = 0; j < field.resolvers.length; j += 1) {
          const resolver = field.resolvers[j];
          // eslint-disable-next-line no-await-in-loop
          value = await resolver.call(_this, value);
        }
        this.#data[field.key] = value;
      }
      this.isBuilding = false;
    } catch (e) {
      error(e);
      this.isBuilding = false;
      // Rollback the changes
      this.#data = { ...values };
      throw e;
    }
  }

  getTriggeredField() {
    return this.#triggeredField;
  }

  getRequestedValue() {
    return this.#requestedValue;
  }

  getData(key) {
    const field = this.#fields.find((f) => f.key === key);
    if (field === undefined) {
      throw new Error(`Field ${key} not existed`);
    }

    return this.#data[field.key];
  }

  setError(key, message) {
    if (!message) {
      delete this.#errors[key];
    } else {
      this.#errors[key] = message;
    }
  }

  async setData(key, value, force = false) {
    this.#triggeredField = key;
    this.#requestedValue = value;
    if (this.isBuilding === true) {
      throw new Error('Can not set value when object is building');
    }
    const field = this.#fields.find((f) => f.key === key);
    if (field === undefined) {
      throw new Error(`Field ${key} not existed`);
    }

    if (isEqualWith(this.#data[key], value) && !force) {
      return value;
    }

    // Run the full build
    await this.build();
    const result = this.#data[key];
    if (!isEqualWith(result, value)) {
      throw new Error(
        `Field resolvers returned different value - ${key}, ${value}, ${result}`
      );
    } else {
      return value;
    }
  }

  hasError() {
    return Object.keys(this.#errors).length > 0;
  }

  getErrors() {
    return this.#errors;
  }

  export() {
    const data = {};
    this.#fields.forEach((f) => {
      data[f.key] = structuredClone(this.#data[f.key]);
    });
    if (this.hasError()) {
      data.errors = Object.values(this.#errors);
    } else {
      data.errors = {};
    }
    return data;
  }
};
