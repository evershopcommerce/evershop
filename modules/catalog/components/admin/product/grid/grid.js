import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/pagination";
import { get } from "../../../../../../lib/util/get";
import { Card } from "../../../../../cms/components/admin/card";

export default function ProductGrid() {
    const products = get(useAppState(), "grid.products", []);
    const total = get(useAppState(), "grid.total", 0);
    const limit = get(useAppState(), "grid.limit", 20);
    const page = get(useAppState(), "grid.page", 1);

    return <Card>
        <table className="listing sticky">
            <thead>
                <tr>
                    <Area
                        className={""}
                        id={"productGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                {products.map((p, i) => {
                    return <tr key={i}>
                        <Area
                            className={""}
                            id={"productGridRow"}
                            row={p}
                            noOuter={true}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {products.length === 0 &&
            <div>There is no product to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </Card>;
}