import A from "../../../../../../js/production/a.js";
import {Fetch} from "../../../../../../js/production/fetch.js";

function OrderInfo(props) {
    return <div className={""}>
        <div>
            <span>
                {
                    props.status === "pending" && <span className="uk-label uk-label-warning"><span uk-icon="icon: tag; ratio: 0.8"></span> Pending</span>
                }
                {
                    props.status === "processing" && <span className="uk-label"><span uk-icon="icon: tag; ratio: 0.8"></span> Processing</span>
                }
                {
                    props.status === "completed" && <span className="uk-label uk-label-success"><span uk-icon="icon: tag; ratio: 0.8"></span> Completed</span>
                }
                {
                    props.status === "cancelled" && <span className="uk-label uk-label-danger"><span uk-icon="icon: tag; ratio: 0.8"></span> Cancelled</span>
                }
            </span>
        </div>
    </div>
}

function Summary({tax_amount, discount_amount, coupon, grand_total}) {
    const currency = ReactRedux.useSelector(state => _.get(state, 'appState.currency', 'USD'));
    const language = ReactRedux.useSelector(state => _.get(state, 'appState.language[0]', 'en'));

    const _tax_amount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(tax_amount);
    const _discount_amount = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(discount_amount);
    const _grand_total = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(grand_total);
    return <div className={"uk-width-1-3"}>
        <div className="uk-overflow-auto">
            <div><strong>Summary</strong></div>
            <table className="table">
                <tbody>
                <tr><td><span>Tax:</span></td><td><span>{_tax_amount}</span></td></tr>
                { parseInt(discount_amount) > 0 &&
                <tr><td><span>Discount <i>({coupon})</i>:</span></td><td><span>{_discount_amount}</span></td></tr>
                }
                <tr><td><span>Grand total:</span></td><td><span>{_grand_total}</span></td></tr>
                </tbody>
            </table>
        </div>
    </div>
}

function Items({items}) {
    return <table className="table">
        <thead>
        <tr>
            <th>
                <span>Product</span>
            </th>
            <th>
                <span>Quantity</span>
            </th>
            <th>
                <span>Total</span>
            </th>
        </tr>
        </thead>
        <tbody>
        { items.map((i, k) => {
            const currency = ReactRedux.useSelector(state => _.get(state, 'appState.currency', 'USD'));
            const language = ReactRedux.useSelector(state => _.get(state, 'appState.language[0]', 'en'));
            const _price = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(i.product_price);
            const _finalPrice = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(i.final_price);
            const _total = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(i.total);
            return <tr key={k}>
                <td>
                    <div className="uk-child-width-expand@s uk-grid uk-grid-small">
                        <div className="uk-width-auto@m">

                        </div>
                        <div className="uk-width-expand@m">
                            <A url={i.product_url}><span>{i.product_name}</span></A>
                            {parseFloat(i.final_price) < parseFloat(i.product_price) && <div><del>{_price}</del></div>}
                            <div><span>{_finalPrice}</span></div>
                        </div>
                    </div>
                </td>
                <td><span>{i.qty}</span></td>
                <td><span>{_total}</span></td>
            </tr>
        })}
        </tbody>
    </table>
}

function Order({index, order}) {
    let date = new Date(order.created_at);
    return <div className="card">
        <div className="card-header" id={"heading" + index}>
            <button className="btn btn-link btn-block text-left" type="button" data-toggle="collapse"
                    data-target={"#collapse" + index} aria-expanded="true" aria-controls={"collapse" + index}>
                <span>#{order.order_number}</span> <i>{date.toDateString()}</i>
            </button>
        </div>
        <div id={"collapse" + index} className={index === 0 ? "collapse show" : "collapse"} aria-labelledby={"heading" + index} data-parent="#my-account-orders">
            <div className="card-body">
                <OrderInfo {...order}/>
                <Items items={order.items}/>
                <Summary {...order}/>
            </div>
        </div>
    </div>
}

function Loader() {
    return <ul className="list-basic">
        <li>
            <div className="ph-item">
                <div>
                    <div className="ph-row">
                        <div className="ph-col-12"></div>
                    </div>
                </div>
            </div>
        </li>
        <li>
            <div className="ph-item">
                <div>
                    <div className="ph-row">
                        <div className="ph-col-12"></div>
                    </div>
                </div>
            </div>
        </li>
        <li>
            <div className="ph-item">
                <div>
                    <div className="ph-row">
                        <div className="ph-col-12"></div>
                    </div>
                </div>
            </div>
        </li>
    </ul>
}

export default function Orders({query}) {
    const [loading, setLoading] = React.useState(true);
    const [orders, setOrders] = React.useState([]);
    const api = ReactRedux.useSelector(state => _.get(state, 'appState.graphqlApi'));
    React.useEffect(function() {
        Fetch(api, false, 'POST', {query: query}, null, (response)=> {
            if(_.get(response, 'payload.success') === true) {
                setOrders(_.get(response, 'payload.data.customer.orders'));
                setLoading(false);
            }
        })
    }, []);
    return <div className="col-12 col-md-6 mt-4">
        <h2>Your orders</h2>
        {loading === true && <Loader/>}
        {loading === false && <div className="accordion" id="my-account-orders">
            {orders.map((o,i) => {
                return <Order index={i} key={i} order={o}/>;
            })}
        </div>}
        {(loading === false && orders.length === 0) && <p>You have no order to show</p>}
    </div>
}