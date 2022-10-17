/* eslint-disable react/jsx-no-constructed-context-values */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import PubSub from 'pubsub-js';
import { validator } from './validator';
import { get } from '../../util/get';
import { FORM_SUBMIT, FORM_VALIDATED } from '../../util/events';
import Button from './Button';
import { serializeForm } from '../../util/formToJson';

export const FormContext = React.createContext();
export const FormDispatch = React.createContext();

export function Form(props) {
  const {
    id,
    action,
    method,
    isJSON,
    onStart,
    onComplete,
    onError,
    onSuccess,
    onValidationError,
    children,
    submitBtn = true,
    btnText
  } = props;

  const [fields, setFields] = React.useState([]);
  const formRef = React.useRef();
  const [loading, setLoading] = useState(false);

  const addField = (name, value, validationRules = []) => {
    setFields((previous) => previous.concat({ name, value, validationRules }));
  };

  const updateField = (name, value, validationRules = []) => {
    setFields((previous) => previous.map((f) => {
      if (f.name === name) return { name, value, validationRules };
      else return f;
    }));
  };

  const removeField = (name) => {
    setFields((previous) => previous.filter((f) => f.name !== name));
  };

  const validate = () => {
    const errors = {};
    fields.forEach((f) => {
      f.validationRules.forEach((r) => {
        const rule = validator.getRule(r);
        if (rule === undefined) return;
        if (!rule.handler.call(fields, f.value)) {
          errors[f.name] = rule.errorMessage;
        } else {
          delete errors[f.name];
        }
      });
    });

    if (Object.keys(errors).length === 0) {
      setFields(
        fields.map((f) => ({ ...f, error: undefined }))
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

  const submit = async (e) => {
    e.preventDefault();
    try {
      PubSub.publishSync(FORM_SUBMIT, { props });
      const errors = validate();
      PubSub.publishSync(FORM_VALIDATED, { formId: id, errors });
      if (Object.keys(errors).length === 0) {
        const formData = new FormData(document.getElementById(id));
        setLoading(true);
        if (onStart) await onStart();
        const response = await fetch( // TODO: Replace by Axios
          action,
          {
            method,
            body: isJSON === true ? JSON.stringify(serializeForm(formData.entries())) : formData,
            headers: Object.assign({
              'X-Requested-With': 'XMLHttpRequest'
            },
              isJSON === true ? { 'Content-Type': 'application/json' } : {}
            )
          }
        );

        if (!response.headers.get('content-type') || !response.headers.get('content-type').includes('application/json')) {
          throw new TypeError('Something wrong. Please try again');
        }

        const responseJson = await response.json();
        if (get(responseJson, 'data.redirectUrl') !== undefined) {
          window.location.href = responseJson.data.redirectUrl;
          return true;
        }

        if (onSuccess) {
          await onSuccess(responseJson);
        }
      } else if (onValidationError) {
        await onValidationError();
      }
    } catch (error) {
      if (onError) {
        await onError(error);
      }
      throw error
    } finally {
      setLoading(false);
      if (onComplete) {
        await onComplete();
      }
    }
    return true;
  };

  return (
    <FormContext.Provider
      value={{
        fields, addField, updateField, removeField, ...props
      }}
    >
      <FormDispatch.Provider value={{ submit }}>
        <form
          ref={formRef}
          id={id}
          action={action}
          method={method}
          onSubmit={(e) => submit(e)}
        >
          {children}
          {submitBtn === true && (
            <div className="form-submit-button flex border-t border-divider mt-1 pt-1">
              <Button
                title={(btnText || 'Save')}
                onAction={
                  () => { document.getElementById(id).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
                }
                isLoading={loading}
              />
            </div>
          )}
        </form>
      </FormDispatch.Provider>
    </FormContext.Provider>
  );
}

Form.propTypes = {
  action: PropTypes.string.isRequired,
  btnText: PropTypes.string,
  children: PropTypes.oneOfType(
    [PropTypes.arrayOf(PropTypes.node), PropTypes.node]
  ).isRequired,
  id: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  onError: PropTypes.func,
  onStart: PropTypes.func,
  onSuccess: PropTypes.func,
  onValidationError: PropTypes.func,
  submitBtn: PropTypes.bool
};

Form.defaultProps = {
  btnText: undefined,
  onComplete: undefined,
  onError: undefined,
  onStart: undefined,
  onSuccess: undefined,
  onValidationError: undefined,
  submitBtn: true
};

export const useFormContext = () => React.useContext(FormContext);
export const useFormDispatch = () => React.useContext(FormDispatch);
