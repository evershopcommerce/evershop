import React from 'react';
import { Summary } from "./summary/Summary";
import Area from "../../../../../lib/components/Area";
import { get } from '../../../../../lib/util/get';
import { useAppState } from '../../../../../lib/context/app';
import { AddressSummary } from "../../../../customer/views/site/address/AddressSummary";
import Button from "../../../../../lib/components/form/Button";

const CustomerInfo = () => {
    let context = useAppState();
    let order = get(context, 'order', {});
    return <div className='checkout-success-customer-info'>
        <h3 className='thank-you flex justify-start space-x-1'>
            <div className='check flex justify-center self-center text-interactive'>
                <svg style={{ width: '3rem', height: '3rem' }} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div className='self-center'>
                <span style={{ fontSize: '1.6rem', fontWeight: '300' }}>Order #{order.order_number}</span>
                <div>Thank you {order.customer_full_name}!</div>
            </div>
        </h3>

        <div className='customer-info mt-3 mb-2'>
            <div className='heading font-bold mb-2'>Customer information</div>
            <div className='grid grid-cols-2 gap-3'>
                <div>
                    <div className='mb-2'>
                        <div className='mb-075'>Contact information</div>
                        <div className="text-textSubdued">{order.customer_email}</div>
                    </div>
                    <div>
                        <div className='mb-075'>Shipping Address</div>
                        <div className="text-textSubdued"><AddressSummary address={order.shippingAddress} /></div>
                    </div>
                </div>
                <div>
                    <div className='mb-2'>
                        <div className='mb-075'>Payment Method</div>
                        <div className="text-textSubdued">{order.payment_method_name}</div>
                    </div>
                    <div>
                        <div className='mb-075'>Billing Address</div>
                        <div className="text-textSubdued"><AddressSummary address={order.billingAddress} /></div>
                    </div>
                </div>
            </div>
        </div>
        <Button url="/" title="CONTINUE SHOPPING" />
    </div>
}

export default function CheckoutPage() {
    return <Area
        id={"checkoutSuccessPage"}
        className="page-width grid grid-cols-1 md:grid-cols-2 gap-3"
        coreComponents={[
            {
                'component': { default: CustomerInfo },
                'props': {},
                'sortOrder': 10,
                'id': 'customerInfo'
            },
            {
                'component': { default: Summary },
                'props': {},
                'sortOrder': 30,
                'id': 'summaryBlock'
            }
        ]}
    />
}