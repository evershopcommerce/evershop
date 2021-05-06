import {renderToString} from "react-dom/server";
import Html from "../../../lib/components/html";
import AppContext from "../../../lib/context/app";
import React from "react";

export default function render(value, components) {
    return renderToString(<AppContext.Provider value={...value, components}><Html components={components}/></AppContext.Provider>);
}
