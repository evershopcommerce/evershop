import React from "react"
import { appContext } from "../../../../lib/context/app"
import { get } from "../../../../lib/util/get"

export default function Menu() {
    let items = get(React.useContext(appContext), "data.menuItems", []);
    return <div className="main-menu">
        <ul className="nav justify-content-center">
            {items.map((i, index) => {
                return <li className="nav-item" key={index}>
                    <a className="nav-link" href={i.url}>{i.name}</a>
                </li>
            })}
        </ul>
    </div>
}