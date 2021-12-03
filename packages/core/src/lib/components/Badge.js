import React from "react"

export default function Badge({ title, variant = 'default', progress = 'default' }) {
    let _variant = ['default', 'success', 'info', 'attention', 'critical', 'warning', 'new'].includes(variant) ? `${variant}` : 'default';
    let _progress = ['incomplete', 'complete', 'partiallycomplete'].includes(progress) ? `${progress}` : 'default';
    return <span className={_variant + ' badge'}>
        <span className={_progress + ' progress rounded-100'}>
            {progress === 'partiallycomplete' && <span></span>}
        </span>
        <span className="self-center title">{title}</span>
    </span>
}