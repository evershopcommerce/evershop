import {Form} from "../../../../../../../js/production/form/form.js";
import Text from "../../../../../../../js/production/form/fields/text.js";
import Password from "../../../../../../../js/production/form/fields/password.js";

function LoggedInCustomer() {
    const fullName = ReactRedux.useSelector(state => _.get(state, 'appState.customer.full_name'));
    const email = ReactRedux.useSelector(state => _.get(state, 'appState.customer.email'));

    return <div className="checkout-contact-info">
        <div><strong>Contact information</strong></div>
        <div><span>Full name:</span> <span>{fullName}</span></div>
        <div><span>Email:</span> <span>{email}</span></div>
    </div>
}

function Guest({loginUrl, setContactUrl}) {
    const [wantLogin, setWantLogin] = React.useState(false);
    const [wantEdit, setWantEdit] = React.useState(false);
    const [formButton, setFormButton] = React.useState('Submit');
    const [formAction, setFormAction] = React.useState(setContactUrl);
    const fullName = ReactRedux.useSelector(state => _.get(state, 'appState.cart.fullName'));
    const email = ReactRedux.useSelector(state => _.get(state, 'appState.cart.email'));
    const onClickWantLogin = (e) => {
        e.preventDefault();
        setFormAction(wantLogin === true ? setContactUrl : loginUrl);
        setWantLogin(!wantLogin);
        setFormButton('Login');
    };

    const onClickWantEdit = (e) => {
        e.preventDefault();
        setWantEdit(true);
    };

    return <div className="">
        <div>
            <strong>Contact information</strong> <a href="#" onClick={(e)=> onClickWantLogin(e)}>Login?</a>
        </div>
        {(email && fullName) && <div>
            <div><span>Full name:</span> <span>{fullName}</span></div>
            <div><span>Email:</span> <span>{email}</span></div>
            <a href="#" onClick={(e)=>onClickWantEdit(e)}>Edit</a>
        </div>}
        {(!email || !fullName || wantEdit === true || wantLogin === true) && <div>
            <Form
                id={"checkout-contact-form"}
                action={formAction}
                method={"POST"}
                submitText={formButton}
                onComplete={wantEdit === true ? () => setWantEdit(false) : undefined}
            >
                {wantLogin !== true && <Text
                    formId={"checkout-contact-form"}
                    name={"full_name"}
                    validation_rules={['notEmpty']}
                    label={"Full name"}
                    value={fullName}
                />}
                <Text
                    formId={"checkout-contact-form"}
                    name={"email"}
                    validation_rules={['notEmpty', 'email']}
                    label={"Email"}
                    value={email}
                />
                {wantLogin === true && <Password
                    formId={"checkout-contact-form"}
                    name={"password"}
                    validation_rules={['notEmpty']}
                    label={"Password"}
                />}
            </Form>
        </div>}
    </div>
}
export default function ContactInformationForm({loginUrl, setContactUrl}) {
    const email = ReactRedux.useSelector(state => _.get(state, 'appState.customer.email', null));
    return <div className="col-12 checkout-contact">
        {email === null && <Guest loginUrl={loginUrl} setContactUrl={setContactUrl}/>}
        {email !== null && <LoggedInCustomer/>}
    </div>
}