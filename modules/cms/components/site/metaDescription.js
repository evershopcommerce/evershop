import React from "react";
import Meta from "../../../../lib/components/meta";
import { useAppState } from "../../../../lib/context/app";
import { get } from "../../../../lib/util/get";

export default function MetaDescription() {
    const description = get(useAppState(), "metaDescription", "");

    return <Meta name="description" content={description} />
}