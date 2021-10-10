import React from "react"

export default function Dot({ size = '1rem', variant = 'primary' }) {
    let _variant = ['default', 'success', 'info', 'attention', 'critical', 'warning', 'new'].includes(variant) ? `${variant}` : 'default';
    return <span className={_variant + ' dot'} style={{ width: size, height: size }}></span>
}