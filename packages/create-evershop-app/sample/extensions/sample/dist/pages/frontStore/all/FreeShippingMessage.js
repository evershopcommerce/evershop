import React from 'react';
export default function FreeShippingMessage() {
    return (React.createElement("div", { className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 relative overflow-hidden" },
        React.createElement("div", { className: "container mx-auto text-center relative z-10" },
            React.createElement("p", { className: "font-medium flex items-center justify-center gap-2" },
                React.createElement("svg", { className: "w-5 h-5 flex-shrink-0", fill: "currentColor", viewBox: "0 0 20 20" },
                    React.createElement("path", { d: "M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" }),
                    React.createElement("path", { d: "M3 4a1 1 0 00-1 1v1a1 1 0 001 1h1l1.68 5.39A3 3 0 008.38 15H15a1 1 0 000-2H8.38a1 1 0 01-.97-.76L6.16 9H15a1 1 0 00.95-.68L17.2 4H3z" })),
                React.createElement("span", null, "\uD83D\uDE9A Free shipping on orders over $50!"),
                React.createElement("span", { className: "hidden sm:inline text-green-100" }, "\u2728 No minimum required"))),
        React.createElement("div", { className: "absolute inset-0 opacity-10" },
            React.createElement("div", { className: "absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full -translate-y-16" }),
            React.createElement("div", { className: "absolute bottom-0 right-1/3 w-24 h-24 bg-white rounded-full translate-y-12" }))));
}
export const layout = {
    areaId: 'body',
    sortOrder: 0
};
//# sourceMappingURL=FreeShippingMessage.js.map