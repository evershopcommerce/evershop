import React from "react";
import Script from "../../../lib/components/script";
import { useAppState } from "../../../lib/context/app";
import { get } from "../../../lib/util/get";

export default function BundleJS() {
    const src = get(useAppState(), "bundleJs");
    return <Script src={src} />;
}