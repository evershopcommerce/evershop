import {ADD_ALERT, ADD_APP_STATE} from "../../../../../../../../js/production/event-types.js";
import AddressForm from "../../../customer/address/address-form.js";


export default function BillingAddressForm(props) {
    const dispatch = ReactRedux.useDispatch();
    const cart = ReactRedux.useSelector(state => _.get(state, 'appState.cart'));
    const onComplete = (response) => {
        if(_.get(response, 'add_checkout_billing_address.status') === true) {
            let address = _.get(response, 'add_checkout_billing_address.address');
            props.areaProps.setNeedSelectAddress(false);
            dispatch({
                'type' : ADD_APP_STATE,
                'payload': {
                    'appState': {
                        'cart': {
                            ...cart,
                            'billingAddress': address
                        }
                    }
                }
            });
        } else {
            dispatch({'type' : ADD_ALERT, 'payload': {alerts: [{id: "checkout_billing_address_error", message: _.get(response, 'add_checkout_billing_address.message', 'Something wrong. Please try again'), type: "error"}]}});
        }
    };

    const onError = () => {
        dispatch({'type' : ADD_ALERT, 'payload': {alerts: [{id: "checkout_billing_address_error", message: 'Something wrong. Please try again', type: "error"}]}});
    };

    if(props.areaProps.needSelectAddress === false)
        return null;
    return <div className="uk-width-1-1">
        <div><strong>New address</strong></div>
        <AddressForm
            action={_.get(props, 'action')}
            countries={_.get(props, 'countries')}
            onComplete={onComplete}
            onError={onError}
        />
    </div>
}