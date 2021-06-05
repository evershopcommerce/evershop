import React from "react";
import Title from "../../../../lib/components/title";
import { appContext } from "../../../../lib/context/app";
import { get } from "../../../../lib/util/get";

export default function MetaTitle() {
    const title = get(React.useContext(appContext), "metaTitle", "");

    return <Title title={title} />
}