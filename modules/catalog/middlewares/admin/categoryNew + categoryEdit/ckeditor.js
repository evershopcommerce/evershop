const { getComponentSource, getAdminJsFile } = require("../../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = function (request, response) {
    [{
        id: "ckeditor",
        areaId: 'head',
        source: getComponentSource("script.js", true),
        props: {
            "src": buildAdminUrl("adminStaticAsset", [getAdminJsFile('ckeditor4/ckeditor.js').replace("/", "")]),
        },
        sortOrder: 1
    }].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}