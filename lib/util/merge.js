function merge(objectOne, objectTwo) {
    if (typeof objectOne !== "object" || objectOne === null)
        throw new Error("`object` must be an object");
    if (typeof objectTwo !== "object" || objectTwo === null)
        throw new Error("`object` must be an object");

    let result = Object.create({});

    for (let key in objectOne) {
        result[key] = objectOne[key] ? objectOne[key] : objectTwo[key];
        delete objectTwo[key];
    }

    return { ...result, ...objectTwo };
}

module.exports = exports = { merge }