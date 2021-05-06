import React from "react";

let Error = (props) => {
    let { error } = props;
    if (!error)
        return "";
    else
        return (<div className="field-validation-error"><span>{error}</span></div>);
};

export { Error }