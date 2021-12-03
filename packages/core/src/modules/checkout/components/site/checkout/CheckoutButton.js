export default function CheckoutButton({ action, cartId }) {

    const onClick = (e) => {
        e.preventDefault();
        Fetch(action, false, 'POST', { cartId: cartId });
    };

    return <tr>
        <td></td>
        <td><div className="checkout-button">
            <a href="#" onClick={(e) => onClick(e)} className="btn btn-success"><span>Place order</span></a>
        </div></td>
    </tr>
}