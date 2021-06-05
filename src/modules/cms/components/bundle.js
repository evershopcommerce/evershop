import React from "react";
import Script from "../../../lib/components/script";
import { appContext } from "../../../lib/context/app";
import { get } from "../../../lib/util/get";

export default function Bundle() {
    const src = get(React.useContext(appContext), "data.bundle");
    return <Script src={src} />;
}