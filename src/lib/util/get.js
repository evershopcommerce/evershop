function get(obj, path, defaultValue) {
    path = path.split('.');
    let current = obj;
    while (path.length) {
        if (typeof current !== 'object' || current === null)
            return defaultValue;
        let key = path.shift();
        if (current[key] === undefined || current[key] === null)
            return defaultValue;
        current = current[key];
    }
    return current;
}

export { get }