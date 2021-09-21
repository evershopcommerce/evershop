import React from "react"
import { useAppState } from "../../../../lib/context/app"
import { get } from "../../../../lib/util/get"

export default function Menu() {
    let items = get(useAppState(), "menuItems", []);
    return <div className="main-menu self-center hidden md:block">
        <ul className="nav flex space-x-275 justify-content-center">
            {items.map((i, index) => {
                return <li className="nav-item" key={index}>
                    <a className="nav-link hover:underline" href={i.url}>{i.name}</a>
                </li>
            })}
        </ul>
    </div>
}