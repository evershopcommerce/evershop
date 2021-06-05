import React from "react";

export default function Script({ src, isAsync = false }) {
    return (src === undefined) ? (null) : <script src={src} async={isAsync}></script>
}