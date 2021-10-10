import React from "react";
import Area from "./area";

const Html = () => {
    return <React.Fragment>
        <head>
            <Area noOuter={true} id="head" />
        </head>
        <body>
            <div id="app" className='bg-background'>
                <Area id="body" className="wrapper" />
            </div>
            <Area id="after.body" noOuter={true} />
        </body>
    </React.Fragment>
}

export default Html
