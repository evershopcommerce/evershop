import React from "react";
import Script from "../../../lib/components/script";
import { useAppState } from "../../../lib/context/app";
import { get } from "../../../lib/util/get";

export default function Bundle() {
    const src = get(useAppState(), "bundle");
    return <Script src={src} />;
}