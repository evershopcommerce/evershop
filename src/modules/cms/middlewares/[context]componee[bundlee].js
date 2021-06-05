module.exports = function (request, response) {
    let components = {};
    let bComponents = {};
    response.addComponent = function addComponent(id, areaId, source, props, sortOrder) {
        components[areaId] = components[areaId] || {};
        bComponents[areaId] = bComponents[areaId] || {};

        components[areaId][id] = {
            id, source, component: require(source), props, sortOrder
        }

        bComponents[areaId][id] = {
            id, source, component: `---require("${source}")---`, props, sortOrder
        }

        return response;
    }

    response.removeWidget = function removeWidget(id) {

    }

    response.getComponents = function getComponents() {
        return components;
    }

    response.getBWidgets = function getBWidgets() {
        return bComponents;
    }
}