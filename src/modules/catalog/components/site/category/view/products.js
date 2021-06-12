import React from "react";
import ProductList from '../../product/list/list';
import Pagination from "../../product/list/pagination";
import Sorting from "../../product/list/sorting";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function Products({ withPagination = true, withSorting = true }) {
    const context = useAppState();

    return <div className="">
        <div className="tool-bar-top d-flex justify-content-sm-between">
            {withPagination === true && <Pagination
                currentPage={1}
                currentUrl={get(context, "currentUrl")}
                currentPage={get(context, "pagination.currentPage")}
                limit={get(context, "pagination.limit")}
                total={get(context, "pagination.total")}
            />}
            {withSorting === true && <Sorting />}
        </div>
        <ProductList products={get(context, "category.products")} countPerRow={3} />
        {withPagination === true && <Pagination
            currentPage={1}
            currentUrl={get(context, "currentUrl")}
            currentPage={get(context, "pagination.currentPage")}
            limit={get(context, "pagination.limit")}
            total={get(context, "pagination.total")}
        />}
    </div>
}