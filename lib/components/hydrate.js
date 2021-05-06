import Html from "./html";
import React from "react";
import ReactDOM from "react-dom";
import { appContext } from "../context/app";

const App = () => {
    const updateContext = (data) => {
        setContext((state) => ({ ...state, ...data }))
    }
    const [context, setContext] = React.useState({
        data: window.appContext,
        setData: updateContext
    });

    return <appContext.Provider value={context}><Html /></appContext.Provider>
}
ReactDOM.hydrate(
    <App />,
    document.getElementById("root")
);