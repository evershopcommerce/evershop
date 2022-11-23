/* eslint-disable no-multi-assign */
class _FormData {
  constructor() {
    this.data = {};
  }

  append(name, value) {
    this.data[name] = value;
    return this;
  }

  delete(name) {
    delete this.data[name];
    return this;
  }

  build() {
    const data = new FormData();
    Object.keys(this.data).forEach((key) => {
      data.append(key, this.data[key]);
    });
    return data;
  }
}

function formData() {
  return new _FormData();
}

module.exports = exports = formData;
