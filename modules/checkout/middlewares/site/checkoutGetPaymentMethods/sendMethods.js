module.exports = async (request, response, stack, next) => {
    let promises = [];
    for (let id in stack) {
        // Check if middleware is async
        if (Promise.resolve(stack[id]) === stack[id])
            promises.push(stack[id]);
    }
    try {
        // Wait for all async middleware to be completed
        await Promise.all(promises);
        response.json({
            data: {
                methods: [{ code: "cod", name: "Cash on delivery" }] //TODO: this will be handled by each method
            },
            success: true,
            message: ""
        });
    } catch (e) {
        response.json({
            data: {
                methods: []
            },
            success: false,
            message: e.message
        });
    }
};