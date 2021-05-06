import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/pagination";
import { get } from "../../../../../../lib/util/get";

export default function CMSPageGrid() {
    const pages = get(React.useContext(appContext), "data.grid.pages", []);
    const total = get(React.useContext(appContext), "data.grid.total", 0);
    const limit = get(React.useContext(appContext), "data.grid.limit", 20);
    const page = get(React.useContext(appContext), "data.grid.page", 1);

    return <div className="grid sml-block"><div className={"page-grid mt-4"}>
        <table className="table table-bordered sticky">
            <thead>
                <tr>
                    <Area
                        className={""}
                        id={"pageGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                {pages.map((p, i) => {
                    return <tr key={i}>
                        <Area
                            className={""}
                            id={"pageGridRow"}
                            row={p}
                            noOuter={true}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {pages.length === 0 &&
            <div>There is no page to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </div></div>;
}