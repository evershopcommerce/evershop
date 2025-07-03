import React from 'react';
export default function Hello() {
    return (React.createElement("div", { className: "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-lg" },
        React.createElement("div", { className: "container mx-auto px-6 py-4" },
            React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center space-x-3" },
                    React.createElement("div", { className: "bg-white bg-opacity-20 rounded-full p-2" },
                        React.createElement("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20" },
                            React.createElement("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z", clipRule: "evenodd" }))),
                    React.createElement("div", null,
                        React.createElement("h1", { className: "text-xl font-bold tracking-wide" }, "Hello, Admin!"),
                        React.createElement("p", { className: "text-blue-100 text-sm opacity-90" },
                            "Welcome to your dashboard. You can edit this component at",
                            ' ',
                            React.createElement("code", null, "`extensions/sample/src/pages/admin/all/Hello.tsx`"),
                            "."),
                        React.createElement("p", { className: "text-blue-200 text-xs mt-1" }, "You can also remove this by disabling the extension `sample`."))),
                React.createElement("div", { className: "hidden md:flex items-center space-x-4" },
                    React.createElement("div", { className: "bg-white bg-opacity-10 rounded-full px-4 py-2" },
                        React.createElement("span", { className: "text-sm font-medium" }, "Admin Panel")),
                    React.createElement("div", { className: "w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center" },
                        React.createElement("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20" },
                            React.createElement("path", { fillRule: "evenodd", d: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z", clipRule: "evenodd" })))))),
        React.createElement("div", { className: "h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-30" })));
}
export const layout = {
    areaId: 'content',
    sortOrder: 0
};
//# sourceMappingURL=Hello.js.map