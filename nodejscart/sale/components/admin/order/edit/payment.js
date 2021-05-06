import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Status({ status }) {
    return <td>
        <span className={`badge badge-${status.badge}`}><i className="fas fa-tag"></i> {status.name}</span>
    </td>
}

function Info({ orderId, method, methodName, paymentStatus, grandTotal }) {
    return <div className='payment-info'>
        <table className='table table-bordered'>
            <thead>
                <tr>
                    <Area
                        id={"orderPaymentBlockInfoHeader"}
                        orderId={orderId}
                        method={method}
                        methodName={methodName}
                        grandTotal={grandTotal}
                        status={paymentStatus}
                        noOuter={true}
                        coreWidgets={[
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Status</span> },
                                'sort_order': 10,
                                'id': 'paymentStatusHeader'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Method</span> },
                                'sort_order': 20,
                                'id': 'paymentMethodHeader'
                            },
                            {
                                'component': { default: "th" },
                                'props': { children: <span>Actions</span> },
                                'sort_order': 30,
                                'id': 'paymentActionHeader'
                            }
                        ]}
                    />
                </tr>
            </thead>
            <tbody>
                <tr>
                    <Area
                        id={"orderPaymentBlockInfo"}
                        orderId={orderId}
                        method={method}
                        methodName={methodName}
                        grandTotal={grandTotal}
                        status={paymentStatus}
                        noOuter={true}
                        coreWidgets={[
                            {
                                'component': { default: Status },
                                'props': { status: paymentStatus },
                                'sort_order': 10,
                                'id': 'orderPaymentStatus'
                            },
                            {
                                'component': { default: "td" },
                                'props': { children: <span>{methodName}</span> },
                                'sort_order': 20,
                                'id': 'orderPaymentMethod'
                            }
                        ]}
                    />
                </tr>
            </tbody>
        </table>
    </div>
}

function Transaction({ transactions, currency }) {
    return <div className='payment-transactions'>
        <div><i className="fas fa-credit-card"></i> Payment transactions</div>
        <table className="table table-bordered">
            <thead>
                <tr>
                    <th><span>Date</span></th>
                    <th><span>Type</span></th>
                    <th><span>Code</span></th>
                    <th><span>Amount</span></th>
                    <th><span>Action</span></th>
                </tr>
            </thead>
            <tbody>
                {transactions.map((t, i) => {
                    let date = new Date(t.created_at);
                    const amount = new Intl.NumberFormat('en', { style: 'currency', currency: currency }).format(t.amount);
                    return <tr key={i}>
                        <td><span>{date.toDateString()}</span></td>
                        <td>
                            {t.transaction_type === 'online' && <span uk-tooltip={t.transaction_type} uk-icon="credit-card"></span>}
                            {t.transaction_type === 'offline' && <span uk-tooltip={t.transaction_type} uk-icon="file-text"></span>}
                        </td>
                        <td>
                            {t.parent_transaction_id && <span>{t.parent_transaction_id}</span>}
                            {!t.parent_transaction_id && <span>---</span>}
                        </td>
                        <td><span>{amount}</span></td>
                        <td><span>{t.payment_action}</span></td>
                    </tr>
                })}
                {transactions.length === 0 && <tr><td colSpan="100"><div>There is no transaction to display</div></td></tr>}
            </tbody>
        </table>
    </div>
}

export default function Payment(props) {
    let order = get(React.useContext(appContext), "data.order", {});

    const grandTotal = new Intl.NumberFormat('en', { style: 'currency', currency: order.currency }).format(props.grandTotal);
    return <div className="sml-block mt-4">
        <div className="sml-block-title">Payment</div>
        <div className="overflow-auto">
            <Area
                id={"orderPaymentBlock"}
                orderId={order.orderId}
                method={order.method}
                methodName={order.methodName}
                grandTotal={grandTotal}
                status={order.paymentStatus}
                coreWidgets={[
                    {
                        'component': { default: Info },
                        'props': { ...order },
                        'sort_order': 10,
                        'id': 'order_payment_fo'
                    },
                    {
                        'component': { default: Transaction },
                        'props': { transactions: order.paymentTransactions, currency: order.currency },
                        'sort_order': 20,
                        'id': 'order_payment_transaction'
                    }
                ]}
            />
        </div>
    </div>
}