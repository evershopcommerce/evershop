"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = void 0;
exports.default = OnlyHomePage;
const react_1 = __importDefault(require("react"));
function OnlyHomePage() {
    return (react_1.default.createElement("div", { className: "container mx-auto px-4 py-8 bg-gray-100 rounded-lg shadow-md mt-10" },
        react_1.default.createElement("h1", { className: "font-bold text-center mb-6" }, "Home Page Only"),
        react_1.default.createElement("p", { className: " text-gray-700 text-center" }, "This component is only rendered on the home page."),
        react_1.default.createElement("p", { className: " text-gray-700 text-center" },
            "You can modify this component at",
            ' ',
            react_1.default.createElement("code", null, "`themes/sample/src/pages/homepage/OnlyHomePage.tsx`")),
        react_1.default.createElement("p", { className: " text-gray-700 text-center" }, "You can also remove this by disabling the theme `sample`.")));
}
exports.layout = {
    areaId: 'content',
    sortOrder: 10
};
//# sourceMappingURL=OnlyHomePage.js.map