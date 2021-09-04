module.exports = async (request, response, delegate, next) => {
    try {
        let promises = [];
        for (let id in delegate) {
            // Check if middleware is async
            if (delegate[id] instanceof Promise) {
                promises.push(delegate[id]);
            }
        }
        await Promise.all(promises);
        let results = response.payload || [];

        response.json({
            success: true,
            data: { payload: results }
        });
    } catch (e) {
        response.json({
            success: false,
            message: e.message,
            data: { payload: [] }
        });
    }
}