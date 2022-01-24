import React from "react";
import Title from "../../../../lib/components/Title";
import { useAppState } from "../../../../lib/context/app";
import { get } from "../../../../lib/util/get";

export default function MetaTitle() {
    const title = get(useAppState(), "metaTitle", "");

    return <Title title={title} />
}