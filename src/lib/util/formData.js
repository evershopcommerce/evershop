class _FormData {
    constructor() {
        this.data = {};
    }
    append(name, value) {
        this.data[name] = value;
        return this;
    }
    delete(name) {
        delete this.data[name]
        return this;
    }

    build() {
        let formData = new FormData();
        for (var key in this.data) {
            if (this.data.hasOwnProperty(key)) {
                formData.append(key, this.data[key]);
            }
        }
        return formData;
    }
}

function formData() {
    return new _FormData();
}

module.exports = exports = formData;