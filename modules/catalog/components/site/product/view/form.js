import Area from "../../../../../../lib/components/area"
import { Form } from "../../../../../../lib/components/form/Form";
import { Field } from "../../../../../../lib/components/form/Field";
import { get } from "../../../../../../lib/util/get";
import { useAppState, useAppDispatch } from "../../../../../../lib/context/app";
import React, { useState } from "react";
import Button from "../../../../../../lib/components/form/Button";
import { toast } from "react-toastify";

const ToastMessage = ({ thumbnail, name, qty, count, cartUrl, toastId }) => {
    return <div className="toast-mini-cart">
        <div className='top-head grid grid-cols-2'>
            <div className='self-center'>
                JUST ADDED TO YOUR CART
            </div>
            <div className="self-center close flex justify-end">
                <a href="#" onClick={(e) => { e.preventDefault(); toast.dismiss(toastId); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </a>
            </div>
        </div>
        <div className="item-line flex justify-between">
            <div className='popup-thumbnail flex justify-center'>
                <img src={thumbnail} />
            </div>
            <div className="item-info flex justify-between">
                <div className="name">
                    <san className="font-bold">{name}</san>
                </div>
                <div>Qty: {qty}</div>
            </div>
        </div>
        <a className="add-cart-popup-button" href={cartUrl}>VIEW CART ({count})</a>
        <a className="add-cart-popup-continue text-center underline block" href="#" onClick={(e) => { e.preventDefault(); toast.dismiss(toastId); }}>Continue shopping</a>
    </div>
}

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
    const [toastId, setToastId] = useState();

    const onSuccess = (response) => {
        if (response.success === true) {
            dispatch({ ...context, cart: response.data.cart });
            setToastId(toast(<ToastMessage
                thumbnail={product.gallery[0] ? product.gallery[0]['thumb'] : null}
                name={product.name}
                qty={1}
                count={response.data.cart.items.length}
                cartUrl="/cart"
                toastId={toastId}
            />, { closeButton: false }));
        }
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