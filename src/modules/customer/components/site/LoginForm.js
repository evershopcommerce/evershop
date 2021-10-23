import { Form } from "../../../../../../js/production/form/form.js";
import Area from "../../../../../../js/production/Area.js";
import A from "../../../../../../js/production/A.js";
import Text from "../../../../../../js/production/form/fields/text.js";
import Password from "../../../../../../js/production/form/fields/password.js";

function Heading() {
    return <h1>Login</h1>
}

export default function LoginForm(props) {
    return <Form id={"customer-login-form"} {...props}>
        <div className="row">
            <Area
                id={"customer-login-form-inner"}
                className={"col-4"}
                coreComponents={[
                    {
                        'component': Heading,
                        'props': {
                        },
                        'sort_order': 10,
                        'id': 'heading'
                    },
                    {
                        'component': Text,
                        'props': {
                            name: "email",
                            value: "",
                            formId: "customer-login-form",
                            label: "Email",
                            validation_rules: ['notEmpty', 'email']
                        },
                        'sort_order': 20,
                        'id': 'email'
                    },
                    {
                        'component': Password,
                        'props': {
                            name: "password",
                            value: "",
                            formId: "customer-login-form",
                            label: "Password",
                            validation_rules: ['notEmpty']
                        },
                        'sort_order': 30,
                        'id': 'password'
                    },
                    {
                        'component': A,
                        'props': {
                            url: props.registerUrl,
                            text: "Register for an account",
                        },
                        'sort_order': 40,
                        'id': 'register-link'
                    }
                ]}
            />
        </div>
    </Form>
}