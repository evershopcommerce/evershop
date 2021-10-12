import React from 'react';
import { toast } from "react-toastify";
import { useAppState, useAppDispatch } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import AddressForm from "../../../../../customer/components/site/address/addressForm";

export default function BillingAddressForm(props) {
    const context = useAppState();
    const dispatch = useAppDispatch();
    const cart = get(context, "cart", {});
    const onSuccess = (response) => {
        if (get(response, 'success') === true) {
            props.areaProps.setNeedSelectAddress(false);
            dispatch({ ...context, cart: { cart, billingAddress: response.data.address } });
        } else {
            toast.error(get(response, "message", "Failed!"));
        }
    };

    const onError = () => {
        dispatch({ 'type': ADD_ALERT, 'payload': { alerts: [{ id: "checkout_billing_address_error", message: 'Something wrong. Please try again', type: "error" }] } });
    };

    if (props.areaProps.needSelectAddress === false)
        return null;
    return <div className="uk-width-1-1">
        <div><strong>New address</strong></div>
        <AddressForm
            action={_.get(props, 'action')}
            countries={_.get(props, 'countries')}
            onSuccess={onSuccess}
            onError={onError}
        />
    </div>
}