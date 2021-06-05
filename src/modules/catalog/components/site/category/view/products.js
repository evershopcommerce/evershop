import React from "react";
import ProductList from '../../product/list/list';
import Pagination from "../../product/list/pagination";
import Sorting from "../../product/list/sorting";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function Products({ withPagination = true, withSorting = true }) {
    const context = React.useContext(appContext);

    return <div className="">
        <div className="tool-bar-top d-flex justify-content-sm-between">
            {withPagination === true && <Pagination
                currentPage={1}
                currentUrl={get(React.useContext(appContext), "data.currentUrl")}
                currentPage={get(React.useContext(appContext), "data.pagination.currentPage")}
                limit={get(React.useContext(appContext), "data.pagination.limit")}
                total={get(React.useContext(appContext), "data.pagination.total")}
            />}
            {withSorting === true && <Sorting />}
        </div>
        <ProductList products={get(context, "data.category.products")} countPerRow={4} />
        {withPagination === true && <Pagination
            currentPage={1}
            currentUrl={get(React.useContext(appContext), "data.currentUrl")}
            currentPage={get(React.useContext(appContext), "data.pagination.currentPage")}
            limit={get(React.useContext(appContext), "data.pagination.limit")}
            total={get(React.useContext(appContext), "data.pagination.total")}
        />}
    </div>
}