import React from "react";
import Area from "../../../../../../lib/components/area";
import { Name } from "./item/name";
import { Thumbnail } from "./item/thumbnail";
import { Price } from "./item/price";
import { get } from "../../../../../../lib/util/get";

export default function ProductList({ products = [], countPerRow = 4 }) {
    if (products.length === 0)
        return <div className="product-list"><div>There is no product to display</div></div>;
    return <div className={"product-list row row-cols-1 row-cols-md-3 " + "row-cols-lg-" + countPerRow}>
        {
            products.map((p, index) => {
                return <Area
                    id={"product_item"}
                    className="listing-tem col"
                    product={p}
                    key={index}
                    coreComponents={[
                        {
                            component: { default: Thumbnail },
                            props: { imageUrl: get(p, 'image.url'), alt: p.name },
                            sort_order: 10,
                            id: "thumbnail"
                        },
                        {
                            component: { default: Name },
                            props: { name: p.name, url: p.url, id: p.product_id },
                            sort_order: 20,
                            id: "name"
                        },
                        {
                            component: { default: Price },
                            props: { price: p.price, salePrice: p.price },
                            sort_order: 30,
                            id: "price"
                        }
                    ]}
                />
            })
        }
    </div>
}