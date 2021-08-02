import React from 'react';

function Button({ title, outline = false, variant = 'primary', onAction }) {
    let className = ['button', variant];
    if (outline === true)
        className.push('outline');
    return (
        <button onClick={(e) => { e.preventDefault(); if (onAction) onAction.call() }} className={className.join(' ')}>
            {title}
        </button>
    );
}

export default Button;