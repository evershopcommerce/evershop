import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function UseShippingOrAnother({ areaProps, action }) {
    const context = useAppState();
    const billingAddress = get(context, "cart.billingAddress", {});
    const cart = get(context, "cart", {});
    const cartId = get(cart, "cart_id")

    const set$UseShippping = (e) => {
        e.preventDefault();
        let formData = new FormData();
        formData.append('cartId', cartId);
        fetch(
            action,
            false,
            'POST',
            formData,
            null,
            (response) => {
                if (_.get(response, 'add_checkout_billing_address.status') === true) {
                    areaProps.setNeedSelectAddress(false);
                    dispatch({
                        'type': ADD_APP_STATE,
                        'payload': {
                            'appState': {
                                'cart': {
                                    ...cart,
                                    'billingAddress': false
                                }
                            }
                        }
                    });
                } else {
                    dispatch({ 'type': ADD_ALERT, 'payload': { alerts: [{ id: `checkout_billing_address_error`, message: _.get(response, 'add_checkout_billing_address.message', "Something wrong. Please try again"), type: "error" }] } });
                }
            },
            () => {
                dispatch({ 'type': ADD_ALERT, 'payload': { alerts: [{ id: `checkout_billing_address_error`, message: 'Something wrong. Please try again', type: "error" }] } });
            });
    };
    return <div className="checkout-billing-address-use-shipping">
        <div>
            <div><label><input onChange={(e) => { set$UseShippping(e) }} type="radio" className="uk-radio" checked={billingAddress === false && areaProps.needSelectAddress === false} /> Use shipping address</label></div>
            <div><label><input onChange={(e) => { areaProps.setNeedSelectAddress(true); }} type="radio" className="uk-radio" checked={billingAddress !== false || areaProps.needSelectAddress === true} /> Use another address</label></div>
        </div>
    </div>
}