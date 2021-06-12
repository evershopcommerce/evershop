import Area from "../../../../../../lib/components/area"
import { Form } from "../../../../../../lib/components/form/form";
import Text from "../../../../../../lib/components/form/fields/text";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";
import React from "react";

function AddToCart() {
    return <div className="add-to-cart">
        <Text validationRules={['notEmpty']} className="qty" name={"qty"} placeholder={"Qty"} formId={"productForm"} />
        <div><button className="btn btn-primary" >Add to cart</button></div>
    </div>
}

export default function ProductForm({ action }) {
    const context = useAppState();
    const product = get(context, "product");

    const onSuccess = (response) => {
        if (response.success === true)
            context.setData({ ...context, cart: response.data.cart });
    }
    return <Form id={"productForm"} action={action} method={"POST"} submitBtn={false} onSuccess={onSuccess}>
        <input type="hidden" name="product_id" value={product.product_id} />
        <Area
            id="productSinglePageForm"
            coreWidgets={[
                {
                    'component': { default: AddToCart },
                    'props': {},
                    'sort_order': 50,
                    'id': 'productSingleBuyButton'
                }
            ]}
        />
    </Form>
}