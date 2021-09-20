import Area from "../../../../../../lib/components/area"
import { Form } from "../../../../../../lib/components/form/Form";
import { Field } from "../../../../../../lib/components/form/Field";
import { get } from "../../../../../../lib/util/get";
import { useAppState, useAppDispatch } from "../../../../../../lib/context/app";
import React, { useState } from "react";
import Button from "../../../../../../lib/components/form/Button";

function AddToCart({ stockAvaibility, loading = false }) {
    return <div className="add-to-cart mt-2">
        <div style={{ width: '8rem' }}>
            <Field type='text' value='1' validationRules={['notEmpty']} className="qty" name={"qty"} placeholder={"Qty"} formId={"productForm"} />
        </div>
        <div className='mt-1'>
            {stockAvaibility === 1 && <Button
                title="ADD TO CART"
                outline={true}
                isLoading={loading}
                onAction={
                    () => { document.getElementById('productForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }
                }
            />}
            {stockAvaibility === 0 && <Button title="SOLD OUT" onAction={() => { }} />}
        </div>
    </div >
}

export default function ProductForm({ action }) {
    const context = useAppState();
    const product = get(context, "product");
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(false);

    const onSuccess = (response) => {
        if (response.success === true)
            dispatch({ ...context, cart: response.data.cart });
    }

    return <Form
        id={"productForm"}
        action={action}
        method={"POST"}
        submitBtn={false}
        onSuccess={onSuccess}
        onStart={() => setLoading(true)}
        onComplete={() => setLoading(false)}
    >
        <input type="hidden" name="product_id" value={product.product_id} />
        <Area
            id="productSinglePageForm"
            coreComponents={[
                {
                    'component': { default: AddToCart },
                    'props': {
                        stockAvaibility: product.stock_availability,
                        loading: loading
                    },
                    'sortOrder': 50,
                    'id': 'productSingleBuyButton'
                }
            ]}
        />
    </Form>
}