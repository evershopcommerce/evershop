function assign(object, data) {
    if (typeof object !== "object" || object === null)
        throw new Error("`object` must be an object");

    if (typeof data !== "object" || data === null)
        throw new Error("`data` must be an object");

    for (let key in data) {
        if ((data[key] && data[key].constructor === Array) && (object[key] && object[key].constructor === Array)) {
            object[key] = object[key].concat(data[key]);
        } else if (typeof object[key] !== "object" || typeof data[key] !== "object" || object[key] === null) {
            object[key] = data[key];
        } else {
            assign(object[key], data[key]);
        }
    }
}

export { assign }