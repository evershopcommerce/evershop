
import React from 'react';

export default function Message({ homepage }) {
    return <div>
        <h1>Congratulation! Your order is placed successfully</h1>
        <a href={homepage}>Homepage</a>
    </div>
}
