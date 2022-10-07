import AddressSummary from '../../../customer/address/address_summary';

function Address({
  address, cartId, addressType = 'shipping', action, setNeedSelectAddress
}) {
  const cart = ReactRedux.useSelector((state) => _.get(state, 'appState.cart'));
  const dispatch = ReactRedux.useDispatch();
  const onComplete = (response) => {
    const path = addressType === 'shipping' ? 'add_checkout_shipping_address' : 'add_checkout_billing_address';
    if (_.get(response, `${path}.status`) === true) {
      setNeedSelectAddress(false);
      if (addressType === 'shipping') {
        dispatch({
          type: ADD_APP_STATE,
          payload: {
            appState: {
              cart: {
                ...cart,
                shippingAddress: address
              }
            }
          }
        });
      } else {
        dispatch({
          type: ADD_APP_STATE,
          payload: {
            appState: {
              cart: {
                ...cart,
                billingAddress: address
              }
            }
          }
        });
      }
    } else {
      dispatch({ type: ADD_ALERT, payload: { alerts: [{ id: `checkout_${addressType}_address_error`, message: _.get(response, `${path}.message`), type: 'error' }] } });
    }
  };

  const onError = () => {
    dispatch({ type: ADD_ALERT, payload: { alerts: [{ id: `checkout_${addressType}_address_error`, message: 'Something wrong. Please try again', type: 'error' }] } });
  };

  const onClick = (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (const key in address) {
      if (address.hasOwnProperty(key)) {
        if (address[key] !== null && key !== 'customer_address_id' && key !== 'delete_url' && key !== 'update_url') { formData.append(`variables[address][${key}]`, address[key]); }
      }
    }
    formData.append('variables[cartId]', cartId);

    Fetch(action, false, 'POST', formData, null, onComplete, onError);
  };

  return <AddressSummary address={address} />;
}

export default function CheckoutAddressBook({
  addresses = [], cartId, addressType = 'shipping', action, areaProps
}) {
  if (addresses.length === 0 || areaProps.needSelectAddress === false) { return null; }

  return (
    <div className="checkout-address-book">
      <h3>Address book</h3>
      {addresses.map((a, i) => (
        <Address
          address={a}
          key={i}
          cartId={cartId}
          addressType={addressType}
          action={action}
          setNeedSelectAddress={areaProps.setNeedSelectAddress}
        />
      ))}
    </div>
  );
}
