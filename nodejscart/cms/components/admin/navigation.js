import React from "react";
import Area from "../../../../lib/components/area";

export default function AdminNavigation(props) {
    return <div className="admin-nav-container">
            <div className="top-bar">
                <a className="menu-toggle" href="#">

                </a>
            </div>
            <div className="admin-nav">
                <ul className="list-unstyled">
                    <Area id="admin.menu" noOuter={true}/>
                </ul>
            </div>
    </div>
}