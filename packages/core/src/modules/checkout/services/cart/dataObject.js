/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash/isEqualWith');
const Topo = require('@hapi/topo');

export class DataObject {
  constructor() {
    this._dataSource = [];
    this._resolvers = [];
    this._building = false;
    this._error = undefined;
  }

  _prepareFields(fields) {
    // eslint-disable-next-line no-shadow
    const _fields = fields.filter((f, index, fields) => {
      if (!f.dependencies) return true;
      const { dependencies } = f;
      let flag = true;
      // Field will be removed if it's dependency missing
      dependencies.forEach((d) => {
        if (flag === false || fields.findIndex((m) => m.key === d) === -1) {
          flag = false;
        }
      });

      return flag;
    });

    const sorter = new Topo.Sorter();
    _fields.forEach((f) => {
      sorter.add(f.key, { before: [], after: f.dependencies, group: f.key });
    });

    this._fields = sorter.nodes.map((n) => {
      const index = _fields.findIndex((f) => f.key === n);
      const f = _fields[index];
      if (this._resolvers.findIndex((r) => r.key === f.key) === -1) {
        this._resolvers.push({
          key: f.key,
          resolver: f.resolver
        });
      }

      _fields.splice(index, 1);

      return { ...f };
    });
  }

  async build() {
    this._building = true;
    for (let i = 0; i < this._resolvers.length; i += 1) {
      const field = this._fields.find((f) => f.key === this._resolvers[i].key);
      // eslint-disable-next-line no-await-in-loop
      field.value = await this._resolvers[i].resolver.call(this);
    }
    this._building = false;
  }

  getData(key) {
    const field = this._fields.find((f) => f.key === key);
    if (field === undefined) { throw new Error(`Field ${key} not existed`); }

    return field.value ?? null;
  }

  async setData(key, value) {
    if (this._building === true) { throw new Error('Can not set value when object is building'); }

    const field = this._fields.find((f) => f.key === key);
    if (field === undefined) { throw new Error(`Field ${key} not existed`); }
    this._dataSource[key] = value;
    await this.build();
    if (!isEqualWith(this.getData(key), value)) { throw new Error(`Field resolver returned different value - ${key}`); } else return value;
  }

  export() {
    const data = {};
    this._fields.forEach((f) => {
      data[f.key] = f.value;
    });

    return data;
  }
}
