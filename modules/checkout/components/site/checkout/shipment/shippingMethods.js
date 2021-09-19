import React from 'react';
import { useFormContext } from '../../../../../../lib/components/form/Form';
import axios from 'axios';
import { Field } from '../../../../../../lib/components/form/Field';

export default function ShippingMethods({ areaProps, getMethodsAPI }) {
    const formContext = useFormContext();
    const [typeTimeout, setTypeTimeout] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [addressProvided, setAddressProvided] = React.useState(false);
    const [methods, setMethods] = React.useState([]);

    React.useEffect(() => {
        let timeout1 = setTimeout(() => {
            let fields = formContext.fields;
            let check = fields.length ? true : false;
            fields.forEach((e) => {
                if (['country', 'province', 'postcode'].includes(e.name) && !e.value)
                    check = false;
            });

            if (check === true) {
                setAddressProvided(true);
                axios.post(getMethodsAPI)
                    .then((response) => {
                        setMethods(response.data.data.methods.map((m) => { return { value: m.code, text: m.name } }));
                        setLoading(false);
                    });
            } else {
                setAddressProvided(false);
            }
        }, 1000)

        return () => {
            clearTimeout(timeout1)
        }
    }, [formContext]);

    return <div className="shipping-methods">
        {loading === true && <div class="loading">
            <svg style={{ background: 'rgb(255, 255, 255, 0)', display: 'block', shapeRendering: 'auto' }} width="2rem" height="2rem" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
                <circle cx="50" cy="50" fill="none" stroke="#f6f6f6" strokeWidth="10" r="43" strokeDasharray="202.63272615654165 69.54424205218055">
                    <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform>
                </circle>
            </svg>
        </div>}
        <div className="title font-bold mt-1 mb-05">Shipping Method</div>
        {(addressProvided === true && methods.length == 0) && <div className='text-center p-3 border border-divider rounded text-textSubdued'>Sorry, there is no available method for your address</div>}
        {(addressProvided === false) && <div className='text-center p-3 border border-divider rounded text-textSubdued'>Please enter a shipping address in order to see shipping quotes</div>}
        {methods.length > 0 && <Field
            type='radio'
            name="shipping_method"
            validationRules={["notEmpty"]}
            options={methods}
        />}
    </div>
}