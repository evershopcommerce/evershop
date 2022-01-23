import React from 'react';

function Dot({ color = 'primary' }) {
    const style = { borderRadius: '100%', with: '0.25rem', height: '0.25rem', backgroundColor: `var(--${color})` }
    return (
        <div style={style}></div>
    );
}

export default Dot;