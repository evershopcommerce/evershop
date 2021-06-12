import Html from "./html";
import React from "react";
import ReactDOM from "react-dom";
import { AppProvider } from "../context/app";


ReactDOM.hydrate(
    <AppProvider value={window.appContext}><Html /></AppProvider>,
    document.getElementById("root")
);