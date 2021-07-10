
function Pending({ status, noOuter = false }) {
    if (noOuter === true)
        return <option value='pending'>Pending</option>;
    else if (status == 'pending')
        return <span className="badge badge-secondary"><i className="fas fa-tag"></i> Pending</span>;
    else
        return null;
}

function Paid({ status, noOuter = false }) {
    if (noOuter === true)
        return <option value='paid'>Paid</option>;
    else if (status == 'paid')
        return <span className="badge badge-success"><i className="fas fa-tag"></i> Paid</span>;
    else
        return null;
}

function Refunded({ status, noOuter = false }) {
    if (noOuter === true)
        return <option value='refunded'>Refunded</option>;
    else if (status == 'refunded')
        return <span className="badge badge-danger"><i className="fas fa-tag"></i> Refunded</span>;
    else
        return null;
}

// TODO: Check again this Area
function PaymentStatus(props) {
    if (props.noOuter === false)
        return <Area
            id="payment_status"
            coreComponents={[
                {
                    component: Pending,
                    props: {
                        ...props
                    },
                    sort_order: 10,
                    id: "payment-status-pending"
                },
                {
                    component: Paid,
                    props: {
                        ...props
                    },
                    sort_order: 20,
                    id: "payment-status-paid"
                },
                {
                    component: Refunded,
                    props: {
                        ...props
                    },
                    sort_order: 30,
                    id: "payment-status-refunded"
                }
            ]}
            {...props}
        />;
    else
        return <Area
            id="payment_status"
            noOuter={true}
            coreComponents={[
                {
                    component: Pending,
                    props: {
                        ...props
                    },
                    sort_order: 10,
                    id: "payment-status-pending"
                },
                {
                    component: Paid,
                    props: {
                        ...props
                    },
                    sort_order: 20,
                    id: "payment-status-paid"
                },
                {
                    component: Refunded,
                    props: {
                        ...props
                    },
                    sort_order: 30,
                    id: "payment-status-refunded"
                }
            ]}
            {...props}
        />;
}

export { PaymentStatus }
