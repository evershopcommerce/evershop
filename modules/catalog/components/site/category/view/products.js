import React from "react";
import ProductList from '../../product/list/list';
import Pagination from "../../product/list/pagination";
import Sorting from "../../product/list/sorting";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function Products({ withPagination = true, withSorting = true }) {
    const context = useAppState();
    const products = get(context, "category.products", []);

    return <div className="page-width">
        <span className="product-count italic block mb-1">{products.length} products</span>
        <ProductList products={products} countPerRow={3} />
        {withPagination === true && <Pagination
            currentPage={1}
            currentUrl={get(context, "currentUrl")}
            currentPage={get(context, "pagination.currentPage")}
            limit={get(context, "pagination.limit")}
            total={get(context, "pagination.total")}
        />}
    </div>
}