import React from "react";

export default function MenuItem({ icon, url, title }) {
    let [isActive, setIsActive] = React.useState(false);
    React.useEffect(() => {
        let currentUrl = window.location.href;
        let baseUrl = window.location.origin;
        let check = currentUrl.split(baseUrl + url);
        if (check.length === 2) {
            if (url.split('/').length === 2) {
                if (check[1] === '' || !/^\/[a-zA-Z1-9]/.test(check[1])) {
                    setIsActive(true);
                }
            } else {
                setIsActive(true);
            }
        }
    }, []);

    return <li className={isActive ? 'active nav-item' : 'nav-item'}><a href={url}>
        <i className={`fas fa-${icon}`}></i>
        {title}
    </a></li>
}