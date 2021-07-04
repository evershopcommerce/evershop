import React from 'react';
import { useFormContext } from '../../../../../../lib/components/form/form';
import { Radio } from '../../../../../../lib/components/form/fields/radio';
import axios from 'axios';

export default function ShippingMethods({ areaProps, getMethodsAPI }) {
    const formContext = useFormContext();
    const [typeTimeout, setTypeTimeout] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [addressProvided, setAddressProvided] = React.useState(false);
    const [methods, setMethods] = React.useState([]);

    React.useEffect(() => {
        if (typeTimeout) clearTimeout(typeTimeout);
        setTypeTimeout(setTimeout(() => {
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
        }, 1500));
    }, [formContext]);

    return <div>
        {loading === true && <div>Loading</div>}
        <h3>Shipping methods</h3>
        {(addressProvided === true && methods.length == 0) && <div>Sorry, there is no available method for your address</div>}
        {(addressProvided === false) && <div>Please provide the address to see available methods</div>}
        <Radio
            name="shipping_method"
            validationRules={["notEmpty"]}
            options={methods}
        />
    </div>
}