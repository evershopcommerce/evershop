import React from "react";
import Script from "./Script";
import { useAppState } from "../context/app";
import { get } from "../util/get";

export default function BundleJS() {
    const src = get(useAppState(), "bundleJs");
    return <Script src={src} />;
}