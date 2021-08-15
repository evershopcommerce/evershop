import React from "react"

export default function Dot({ size = '1rem', variant = 'primary' }) {
    let _variant = ['primary', 'critical', 'interactive', 'border', 'divider'].includes(variant) ? `bg-${variant}` : 'bg-primary';
    return <span className={_variant + ' rounded-100 inline-block'} style={{ width: size, height: size }}></span>
}