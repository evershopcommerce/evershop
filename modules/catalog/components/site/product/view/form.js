import Area from "../../../../../../lib/components/area"
import { Form } from "../../../../../../lib/components/form/Form";
import { Field } from "../../../../../../lib/components/form/Field";
import { get } from "../../../../../../lib/util/get";
import { useAppState, useAppDispatch } from "../../../../../../lib/context/app";
import React from "react";

function AddToCart({ stockAvaibility }) {
    return <div className="add-to-cart mt-2">
        <div style={{ width: '5rem' }}>
            <Field type='text' validationRules={['notEmpty']} className="qty" name={"qty"} placeholder={"Qty"} formId={"productForm"} />
        </div>
        <div className='mt-1'>
            {stockAvaibility === 1 && <button className='button'>ADD TO CART</button>}
            {stockAvaibility === 0 && <a className='button' href="#">SOLD OUT</a>}
        </div>
    </div>
}

export default function ProductForm({ action }) {
    const context = useAppState();
    const product = get(context, "product");
    const dispatch = useAppDispatch();

    const onSuccess = (response) => {
        if (response.success === true)
            dispatch({ ...context, cart: response.data.cart });
    }
    return <Form id={"productForm"} action={action} method={"POST"} submitBtn={false} onSuccess={onSuccess}>
        <input type="hidden" name="product_id" value={product.product_id} />
        <Area
            id="productSinglePageForm"
            coreComponents={[
                {
                    'component': { default: AddToCart },
                    'props': {
                        stockAvaibility: product.stock_availability
                    },
                    'sort_order': 50,
                    'id': 'productSingleBuyButton'
                }
            ]}
        />
    </Form>
}