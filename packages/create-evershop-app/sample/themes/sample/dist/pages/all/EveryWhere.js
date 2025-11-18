"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = void 0;
exports.default = EveryWhere;
const react_1 = __importDefault(require("react"));
function EveryWhere() {
    return (react_1.default.createElement("div", { className: "container mx-auto px-4 py-8 bg-gray-100 rounded-lg shadow-md mt-10" },
        react_1.default.createElement("h1", { className: "font-bold text-center mb-6" }, "Everywhere"),
        react_1.default.createElement("p", { className: "text-gray-700 text-center" }, "This component is rendered on every page of the store front."),
        react_1.default.createElement("p", { className: "text-gray-700 text-center" },
            "You can modify this component at",
            ' ',
            react_1.default.createElement("code", null, "`themes/sample/src/pages/all/EveryWhere.tsx`")),
        react_1.default.createElement("p", { className: " text-gray-700 text-center" }, "You can also remove this by disabling the theme `sample`.")));
}
exports.layout = {
    areaId: 'content',
    sortOrder: 20
};
//# sourceMappingURL=EveryWhere.js.map