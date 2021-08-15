import React from 'react';

function Button({ title, outline = false, variant = 'primary', onAction, url, isLoading = false }) {
    let className = ['button', variant];
    if (outline === true)
        className.push('outline');
    if (isLoading === true)
        className.push('loading');

    const _onAction = (e) => {
        e.preventDefault();
        if (isLoading === true)
            return;
        if (url) {
            window.location.href = url;
        } else if (onAction) {
            onAction.call();
        }
    }
    return (
        <button onClick={(e) => { _onAction(e) }} className={className.join(' ')}>
            <span>{title}</span>
            {isLoading === true && <svg style={{ background: 'rgb(255, 255, 255, 0)', display: 'block', shapeRendering: 'auto' }} width="2rem" height="2rem" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
                <circle cx="50" cy="50" fill="none" stroke="#5c5f62" strokeWidth="10" r="43" strokeDasharray="202.63272615654165 69.54424205218055">
                    <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform>
                </circle>
            </svg>}
        </button >
    );
}

export default Button;