import {Form} from "../../../../../../js/production/form/form.js";
import Area from "../../../../../../js/production/area.js";
import Text from "../../../../../../js/production/form/fields/text.js";
import Password from "../../../../../../js/production/form/fields/password.js";
import {ADD_ALERT} from "../../../../../../js/dev/event-types.js";

function EditForm(props) {
    return <Form id={"customer-info-form"} {...props}>
        <Area
            id={"customer_info_form_inner"}
            coreWidgets={[
                {
                    'component': Text,
                    'props': {
                        name: "variables[customer][full_name]",
                        value: props.customer.full_name,
                        formId: "customer-info-form",
                        label: "Full name",
                        validation_rules: ['notEmpty']
                    },
                    'sort_order': 10,
                    'id': 'full_name'
                },
                {
                    'component': Text,
                    'props': {
                        name: "variables[customer][email]",
                        value: props.customer.email,
                        formId: "customer-info-form",
                        label: "Email",
                        validation_rules: ['email']
                    },
                    'sort_order': 20,
                    'id': 'email'
                },
                {
                    'component': Password,
                    'props': {
                        name: "variables[customer][password]",
                        value: "",
                        formId: "customer-info-form",
                        label: "New password",
                        validation_rules: []
                    },
                    'sort_order': 30,
                    'id': 'password'
                }
            ]}
        />
    </Form>
}

function Info(props) {
    const [editing, setEditing] = React.useState(false);
    const dispatch = ReactRedux.useDispatch();
    const customerInfo = ReactRedux.useSelector(state => _.get(state, 'appState.customer'));

    const onComplete = (response) => {
        if(_.get(response, 'customerUpdate.status') === true) {
            dispatch({'type' : ADD_ALERT, 'payload': {alerts: [{id: "customer_update_success", message: 'Account updated successfully', type: "success"}]}});
            setEditing(false);
        } else {
            dispatch({'type' : ADD_ALERT, 'payload': {alerts: [{id: "customer_update_error", message: 'Something wrong, please try again', type: "error"}]}});
        }
    };

    return <div className="col-12 col-md-6">
        <h2>Customer information</h2>
        <div><span>Full name</span>: {_.get(customerInfo, 'full_name')}</div>
        <div><span>Email</span>: {_.get(customerInfo, 'email')}</div>
        { !editing && <div><a href="#" onClick={(e) => { e.preventDefault(); setEditing(true);}}>Edit</a></div>}
        { editing && <div>
            <EditForm {...props} customer={customerInfo} onComplete={onComplete}/>
            <a href={"#"} onClick={(e) => { e.preventDefault(); setEditing(false);}}>Cancel</a>
        </div>}
    </div>
}

export default Info;