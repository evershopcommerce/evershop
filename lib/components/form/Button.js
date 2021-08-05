import React from 'react';

function Button({ title, outline = false, variant = 'primary', onAction, url }) {
    let className = ['button', variant];
    if (outline === true)
        className.push('outline');

    const _onAction = (e) => {
        e.preventDefault();
        if (url) {
            window.location.href = url;
        } else if (onAction) {
            onAction.call();
        }
    }
    return (
        <button onClick={(e) => { _onAction(e) }} className={className.join(' ')}>
            {title}
        </button>
    );
}

export default Button;