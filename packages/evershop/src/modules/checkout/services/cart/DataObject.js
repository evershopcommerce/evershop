/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash/isEqualWith');
const Topo = require('@hapi/topo');
const { error } = require('@evershop/evershop/src/lib/log/debuger');

module.exports.DataObject = class DataObject {
  // This is an array of objects: {key, resolver, dependencies}
  static fields;

  constructor() {
    // This is the data opject: {key, value}
    this.data = {}; // TODO: Private field?

    // This object hold the data pool, which is used to build the data object
    this.dataSource = [];
    this.isBuilding = false;
    this.isCommited = false;
    this.errors = {};
  }

  // Sort the fields by dependencies
  prepareFields() {
    // eslint-disable-next-line no-shadow
    const fields = this.constructor.fields.filter((f) => {
      if (!f.dependencies) {
        return true;
      }
      const { dependencies } = f;
      let flag = true;
      // Field will be removed if it's dependency missing
      dependencies.forEach((d) => {
        if (
          flag === false ||
          this.constructor.fields.findIndex((m) => m.key === d) === -1
        ) {
          flag = false;
        }
      });

      return flag;
    });

    const sorter = new Topo.Sorter();
    fields.forEach((f) => {
      sorter.add(f.key, { before: [], after: f.dependencies, group: f.key });
    });

    this.constructor.fields = sorter.nodes.map((key) => {
      const index = fields.findIndex((f) => f.key === key);
      const f = fields[index];

      return { ...f };
    });
  }

  /**
   * Add a field
   * @param {*} key
   * @param {*} resolvers
   * @param {*} dependencies
   */
  static addField(key, resolvers, dependencies = []) {
    if (!this.fields) {
      this.fields = [];
    }

    // Check if the field is existed
    const field = this.fields.find((f) => f.key === key);
    if (field) {
      // Push the resolver and dependencies to the existed field
      // Check if resolvers is an array
      if (!Array.isArray(resolvers)) {
        field.resolvers = [...field.resolvers, resolvers];
      } else {
        field.resolvers = [...field.resolvers, ...resolvers];
      }
      field.dependencies = field.dependencies
        ? [...dependencies, ...field.dependencies]
        : dependencies;
    } else if (!Array.isArray(resolvers)) {
      this.fields.push({ key, resolvers: [resolvers], dependencies });
    } else {
      this.fields.push({ key, resolvers, dependencies });
    }
  }

  // Build the field value. This function will be called when the field value is changed
  // If error is thrown, all changes will be rollback
  async build() {
    const _this = this;

    // Keep current values for rollback
    const values = { ...this.data };

    try {
      this.isBuilding = true;
      this.errors = {};

      for (let i = 0; i < this.constructor.fields.length; i += 1) {
        const field = this.constructor.fields[i];
        let value;
        // Execute the list of resolvers
        for (let j = 0; j < field.resolvers.length; j += 1) {
          const resolver = field.resolvers[j];
          // eslint-disable-next-line no-await-in-loop
          value = await resolver.call(_this, value);
        }
        this.data[field.key] = value;
      }
      this.isBuilding = false;
      this.isCommited = false;
    } catch (e) {
      error(e);
      this.errors.buildingError = e.message;
      this.isBuilding = false;
      // Rollback the changes
      this.data = { ...values };
    }
  }

  getData(key) {
    const field = this.constructor.fields.find((f) => f.key === key);
    if (field === undefined) {
      throw new Error(`Field ${key} not existed`);
    }

    return this.data[field.key];
  }

  async setData(key, value) {
    if (this.isBuilding === true) {
      throw new Error('Can not set value when object is building');
    }
    const field = this.constructor.fields.find((f) => f.key === key);
    if (field === undefined) {
      throw new Error(`Field ${key} not existed`);
    }

    if (isEqualWith(this.data[key], value)) {
      return value;
    }

    // Temporary add value to the data source
    this.dataSource[key] = value;

    // Run the full build
    await this.build();
    const result = this.data[key];
    if (!isEqualWith(result, value)) {
      throw new Error(`Field resolvers returned different value - ${key}`);
    } else {
      return value;
    }
  }

  hasError() {
    return Object.keys(this.errors).length > 0;
  }

  getError() {
    return this.errors;
  }

  export() {
    const data = {};
    this.constructor.fields.forEach((f) => {
      data[f.key] = this.data[f.key];
    });
    if (this.hasError()) {
      data.errors = Object.values(this.errors);
    } else {
      data.errors = [];
    }
    return data;
  }

  commit() {
    this.isCommited = true;
  }
};
