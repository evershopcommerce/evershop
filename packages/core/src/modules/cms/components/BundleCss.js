import React from "react";
import Link from "../../../lib/components/Link";
import { useAppState } from "../../../lib/context/app";
import { get } from "../../../lib/util/get";

export default function BundleCSS() {
    const src = get(useAppState(), "bundleCss");
    return <Link rel={"stylesheet"} href={src} />;
}