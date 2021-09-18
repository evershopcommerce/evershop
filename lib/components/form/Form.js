import React, { useState } from "react";
import { validator } from "./validator";
import { get } from "../../util/get";
import { toast } from "react-toastify";
import PubSub from "pubsub-js";
import { FORM_SUBMIT, FORM_VALIDATED } from "../../util/events";
import Button from "./Button";

export const FormContext = React.createContext();
export const FormDispatch = React.createContext();

export function Form(props) {
    const { id, action, method, children, submitBtn = true, btnText } = props;
    const [fields, setFields] = React.useState([]);
    const formRef = React.useRef();
    const [loading, setLoading] = useState(false);

    const addField = (name, value, validationRules = []) => {
        setFields(previous => previous.concat({ name, value, validationRules }));
    };

    const updateField = (name, value, validationRules = []) => {
        setFields(previous =>
            previous.map((f) => {
                if (f.name === name) return { name, value, validationRules };
                else return f;
            })
        );
    };

    const removeField = (name) => {
        setFields(previous => previous.filter((f) => f.name !== name));
    };

    const validate = () => {
        let errors = {};
        fields.forEach((f) => {
            f.validationRules.forEach(r => {
                let rule = validator.getRule(r);
                if (rule === undefined)
                    return;
                if (!rule.handler.call(fields, f.value)) {
                    errors[f.name] = rule.errorMessage;
                } else {
                    delete errors[f.name];
                }
            });
        });

        if (Object.keys(errors).length === 0) {
            setFields(
                fields.map((f) => {
                    return { ...f, error: undefined };
                })
            );
        } else {
            setFields(
                fields.map((f) => {
                    if (!errors[f.name]) return { ...f, error: undefined };
                    return { ...f, error: errors[f.name] };
                })
            );
        }

        return errors;
    };

    const onSubmit = (e) => {
        e.preventDefault();
        PubSub.publishSync(FORM_SUBMIT, { props });
        let errors = validate();
        PubSub.publishSync(FORM_VALIDATED, { formId: props.id, errors });
        if (Object.keys(errors).length === 0) {
            let formData = new FormData(document.getElementById(id));
            if (props.onStart)
                props.onStart();
            setLoading(true);
            fetch( // TODO: Replace by Axios
                action,
                {
                    method: method,
                    body: formData,
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    }
                })
                .then(response => {
                    if (!response.headers.get('content-type') || !response.headers.get('content-type').includes('application/json')) {
                        throw new TypeError("Something wrong. Please try again");
                    }
                    return response.json();
                })
                .then(response => {
                    if (get(response, "data.redirectUrl") !== undefined) {
                        window.location.href = response.data.redirectUrl;
                        return true;
                    } else if (get(response, "success") === true) {
                        toast.success(get(response, "message", "Success!"));
                    } else if (get(response, "success") === false) {
                        toast.error(get(response, "message", "Failed!"));
                    }
                    if (props.onSuccess)
                        props.onSuccess(response);
                })
                .catch(
                    error => {
                        console.log(error);
                        if (props.onError)
                            props.onError(error);
                    }
                ).finally(() => {
                    if (props.onComplete)
                        props.onComplete();
                    setLoading(false);
                });
        } else {
            if (props.onValidationError)
                props.onValidationError();
        }
    }

    const submit = async (e) => {
        e.preventDefault();
        try {
            PubSub.publishSync(FORM_SUBMIT, { props });
            let errors = validate();
            PubSub.publishSync(FORM_VALIDATED, { formId: props.id, errors });
            if (Object.keys(errors).length === 0) {
                let formData = new FormData(document.getElementById(id));
                setLoading(true);
                if (props.onStart)
                    await props.onStart();

                let _response = await fetch( // TODO: Replace by Axios
                    action,
                    {
                        method: method,
                        body: formData,
                        headers: {
                            "X-Requested-With": "XMLHttpRequest"
                        }
                    });

                if (!_response.headers.get('content-type') || !_response.headers.get('content-type').includes('application/json')) {
                    throw new TypeError("Something wrong. Please try again");
                }

                let response = await _response.json();
                if (get(response, "data.redirectUrl") !== undefined) {
                    window.location.href = response.data.redirectUrl;
                    return true;
                }

                if (props.onSuccess)
                    await props.onSuccess(response);

            } else {
                if (props.onValidationError)
                    await props.onValidationError();
            }
        } catch (e) {
            if (props.onError)
                await props.onError(error);
        } finally {
            setLoading(false);
            if (props.onComplete)
                await props.onComplete();
        }
    }

    return (
        <FormContext.Provider
            value={{ fields, addField, updateField, removeField, ...props }}
        >
            <FormDispatch.Provider value={{ submit }}>
                <form ref={formRef} id={id} action={action} method={method} onSubmit={(e) => submit(e)}>
                    {children}
                    {submitBtn === true && <div className={"form-submit-button flex border-t border-divider mt-1 pt-1"}>
                        <Button
                            title={(btnText || "Save")}
                            onAction={
                                () => { document.getElementById(props.id).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }
                            }
                            isLoading={loading}
                        />
                    </div>}
                </form>
            </FormDispatch.Provider>
        </FormContext.Provider>
    );
}

export const useFormContext = () => React.useContext(FormContext)
export const useFormDispatch = () => React.useContext(FormDispatch)
