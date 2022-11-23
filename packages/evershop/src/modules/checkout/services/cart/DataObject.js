/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash/isEqualWith');
const Topo = require('@hapi/topo');

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
    this.error = undefined;
  }

  // Sort the fields by dependencies
  prepareFields() {
    // eslint-disable-next-line no-shadow
    const fields = this.constructor.fields.filter((f, index, fields) => {
      if (!f.dependencies) return true;
      const { dependencies } = f;
      let flag = true;
      // Field will be removed if it's dependency missing
      dependencies.forEach((d) => {
        if (flag === false || this.constructor.fields.findIndex((m) => m.key === d) === -1) {
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
   * @param {*} resolver 
   * @param {*} dependencies 
   */
  static addField(key, resolver, dependencies) {
    if (!this.fields) this.fields = [];
    this.fields.push({ key, resolver, dependencies });
  }

  // Build the field value. This function will be called when the field value is changed
  // If error is thrown, all changes will be rollback
  async build() {
    let _this = this;

    // Keep current values for rollback
    const values = { ...this.data };

    try {
      this.isBuilding = true;
      this.error = undefined;

      for (let i = 0; i < this.constructor.fields.length; i += 1) {
        const field = this.constructor.fields[i];
        this.data[field.key] = await field.resolver.call(_this);
      }
      this.isBuilding = false;
      this.isCommited = false;
    } catch (e) {
      this.error = e;
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
      throw new Error(`Field resolver returned different value - ${key}`);
    } else {
      return value;
    }
  }

  hasError() {
    return this.error !== undefined;
  }

  getError() {
    return this.error;
  }

  export() {
    const data = {};
    this.constructor.fields.forEach((f) => {
      data[f.key] = this.data[f.key];
    });

    return data;
  }

  commit() {
    this.isCommited = true;
  }
}
