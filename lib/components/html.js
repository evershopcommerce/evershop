const { default: Area } = require("./area")
import React from "react";

const Html = () => {
    return <React.Fragment>
        <head>
            <Area noOuter={true} id="head"/>
        </head>
        <body>
            <div id="app">
                <Area id="body" className="wrapper"/>
            </div>
            <Area id="after.body" noOuter={true}/>
        </body>
    </React.Fragment>
}

export default Html
