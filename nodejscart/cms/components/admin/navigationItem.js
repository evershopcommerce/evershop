import React from "react";

export default function MenuItem({icon, url, title}) {
    return <li className="nav-item"><a href={url}>
            <i className={`fas fa-${icon}`}></i>
            {title}
        </a></li>
}