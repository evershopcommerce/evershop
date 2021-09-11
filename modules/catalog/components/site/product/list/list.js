import React from "react";
import Area from "../../../../../../lib/components/area";
import { Name } from "./item/Name";
import { Thumbnail } from "./item/Thumbnail";
import { Price } from "./item/Price";
import { get } from "../../../../../../lib/util/get";

export default function ProductList({ products = [] }) {
    if (products.length === 0)
        return <div className="product-list">
            <div className='text-center'>There is no product to display</div>
        </div>;
    return <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
        {
            products.map((p, index) => {
                return <Area
                    id={"productListingItem"}
                    className="listing-tem"
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