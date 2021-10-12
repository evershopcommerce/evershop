import React from "react"

export default function Link({ crossOrigin = "anonymous", href, rel, type }) {
    return <link rel={rel} href={href} crossOrigin={crossOrigin} type={type} />
}