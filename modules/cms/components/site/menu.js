import React from "react"
import { useAppState } from "../../../../lib/context/app"
import { get } from "../../../../lib/util/get"
import { Test } from "./test";

export default function Menu() {
    let items = get(useAppState(), "menuItems", []);
    return <div className="main-menu">
        <style>aaaa</style>
        <ul className="nav justify-content-center">
            {items.map((i, index) => {
                return <li className="nav-item" key={index}>
                    <a className="nav-link" href={i.url}>{i.name}</a>
                </li>
            })}
        </ul>
        <Test />
    </div>
}