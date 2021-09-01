import React from "react"

export default function Circle({ variant = 'default' }) {
    let _variant = ['default', 'success', 'info', 'attention', 'critical', 'warning', 'new'].includes(variant) ? `${variant}` : 'default';
    return <span className={_variant + ' circle'}>
        <span className="self-center"><span></span></span>
    </span>
}