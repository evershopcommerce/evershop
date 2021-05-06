const { getComponentSource } = require("../../../../../lib/util");

module.exports = function (request, response) {
    [{
        id: "dragable",
        areaId: 'head',
        source: getComponentSource("script.js", true),
        props: {
            "src": 'https://cdn.jsdelivr.net/npm/@shopify/draggable@1.0.0-beta.12/lib/swappable.js',
        },
        sortOrder: 1
    }].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}