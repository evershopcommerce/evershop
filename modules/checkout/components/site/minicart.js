import React from "react";
import { useAppState } from "../../../../lib/context/app";
import { get } from "../../../../lib/util/get";

export default function MiniCart({ cartUrl, checkoutUrl }) {
    const context = useAppState();
    const currency = get(context, "currency", "USD");
    const language = get(context, "language", "en");
    const items = get(context, "cart.items", []);
    const subTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(get(context, "cart.sub_total", 0));
    const grandTotal = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(get(context, "cart.grand_total", 0));
    const discountAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(get(context, "cart.discount_amount", 0));
    const taxAmount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(get(context, "cart.tax_amount", 0));
    const coupon = get(context, "cart.coupon", null);
    const [show, setShow] = React.useState(false);

    const onOpen = (e) => {
        e.preventDefault();
        setShow(true);
    };

    const onClose = (e) => {
        e.preventDefault();
        setShow(false);
    };

    if (items.length === 0)
        return <div className="mini-cart-wrapper self-center">
            <a className='mini-cart-icon' href="#" onClick={(e) => onOpen(e)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {items.length > 0 && <span>{items.length}</span>}
            </a>
            <div className="mini-cart-content" style={{ display: show === false ? "none" : "block" }}>
                <div className="d-flex justify-content-end">
                    <a href="#" onClick={(e) => onClose(e)}>X</a>
                </div>
                <div className="title mb-4"><p className="h3">Shopping cart</p></div>
                <div>
                    <span>You have no item in cart</span>
                </div>
            </div>
        </div>;

    return <div className="mini-cart-wrapper self-center">
        <a href="#" onClick={(e) => onOpen(e)} className="">
            <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-shopping-bag"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </span>
            <span>({items.length})</span>
        </a>
        <div className="mini-cart-content" style={{ display: show === false ? "none" : "block" }}>
            <div className="d-flex justify-content-end">
                <a href="#" onClick={(e) => onClose(e)}>X</a>
            </div>
            <div className="title mb-4"><p className="h3">Shopping cart</p></div>
            <div className="container">
                {
                    items.map((item, index) => {
                        const _price = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(item.final_price);
                        return <div className="row mb-4" key={item.product_sku}>
                            <div className="col-3">
                                <img src={item.thumbnail} />
                            </div>
                            <div className="col-8">
                                <a href={item.url}><span>{item.product_name}</span></a>
                                <div>{item.qty} x {_price}</div>
                            </div>
                            <div className="col-1">x</div>
                        </div>
                    })
                }
                <div className="mini-cart-summary mt-4">
                    <div className=" d-flex justify-content-end mb-2">
                        <span className="name">Subtotal: </span>
                        <span className="value">{subTotal}</span>
                    </div>
                    <div className=" d-flex justify-content-end mb-2">
                        <span className="name">Tax: </span>
                        <span className="value">{taxAmount}</span>
                    </div>
                    <div className="d-flex justify-content-end mb-2">
                        <span className="name">Discount ({coupon}): </span>
                        <span className="value">{discountAmount}</span>
                    </div>
                    <div className="d-flex justify-content-end mb-2">
                        <span className="name">Grand total: </span>
                        <span className="value">{grandTotal}</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 d-flex justify-content-center"><a className="mini-cart-checkout-button  btn " href={checkoutUrl}><span>Checkout</span></a></div>
            <div className="mt-4 d-flex justify-content-center"><a className="mini-cart-button shopping-cart" href={cartUrl}><span>Shopping cart</span></a></div>
        </div>
    </div>
}