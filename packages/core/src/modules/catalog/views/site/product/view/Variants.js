/* eslint-disable no-restricted-syntax */
import React from 'react';
import PubSub from 'pubsub-js';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { FORM_VALIDATED } from '../../../../../../lib/util/events';
import './Variants.scss';

function isSelected(attributeCode, optionId, currentFilters = {}) {
  return (
    currentFilters[attributeCode] !== undefined
    && parseInt(currentFilters[attributeCode], 10) === parseInt(optionId, 10)
  );
}

function isAvailable(attributeCode, optionId, variants, currentFilters = {}) {
  let availableVars = [];
  if (Object.keys(currentFilters).length === 0) {
    availableVars = variants;
  } else {
    variants.forEach((v) => {
      const vAttrs = v.attributes;
      let flag = true;
      for (const attr of Object.keys(currentFilters)) {
        const option = vAttrs.find((a) => a.attribute_code === attr);
        if (attr !== attributeCode
          && parseInt(option.option_id, 10) !== parseInt(currentFilters[attr], 10)) {
          flag = false;
        }
      }
      if (flag === true) availableVars.push(v);
    });
  }
  return availableVars.find(
    (a) => a.attributes.find(
      (at) => at.attribute_code === attributeCode
        && parseInt(at.option_id, 10) === parseInt(optionId, 10)
    ) !== undefined
  );
}

export default function Variants() {
  const context = useAppState();
  const attributes = get(context, 'product.variantAttributes', []);
  const variants = get(context, 'product.variants', []);
  const [error, setError] = React.useState(null);
  const variantFilters = get(context, 'product.variantSelection', {});
  const currentProductUrl = get(context, 'currentUrl');

  const validate = (formId, errors) => {
    if (formId !== 'productForm') { return true; }

    let flag = true;
    attributes.forEach((a) => {
      if (variantFilters[a.attribute_code] === undefined) { flag = false; }
    });
    if (flag === false) {
      // eslint-disable-next-line no-param-reassign
      errors.variants = 'Missing variant';
      setError('Please select variant option');
      return false;
    } else {
      return true;
    }
  };

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_VALIDATED, (message, data) => {
      validate(data.formId, data.errors);
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
    };
  }, []);

  const getUrl = (attributeCode, optionId) => {
    const url = new URL(currentProductUrl);
    if (!Object.keys(variantFilters).includes(attributeCode)
      || parseInt(variantFilters[attributeCode], 10) !== parseInt(optionId, 10)) {
      url.searchParams.set(attributeCode, optionId);
    } else {
      url.searchParams.delete(attributeCode);
    }

    return url;
  };

  return (
    <div className="variant variant-container grid grid-cols-1 gap-1 mt-2">
      {attributes.map((a, i) => {
        const options = a.options.filter(
          (v, j, s) => s.findIndex((o) => o.option_id === v.option_id) === j
        );
        return (
          <div key={a.attribute_code}>
            <input name={`variant_options[${i}][attribute_id]`} type="hidden" value={a.attribute_id} />
            <input name={`variant_options[${i}][option_id]`} type="hidden" value={variantFilters[a.attribute_code] ? variantFilters[a.attribute_code] : ''} />
            <div className="mb-05 text-textSubdued uppercase"><span>{a.attribute_name}</span></div>
            <ul className="variant-option-list flex justify-start">
              {options.map((o) => {
                let className = 'mr-05';
                if (isSelected(a.attribute_code, o.option_id, variantFilters)) className = 'selected mr-05';
                if (isAvailable(a.attribute_code, o.option_id, variants, variantFilters)) {
                  return (
                    <li key={o.option_id} className={className}>
                      <a href={getUrl(a.attribute_code, o.option_id)}>{o.option_text}</a>
                    </li>
                  );
                } else {
                  return <li key={o.option_id} className="un-available mr-05"><span>{o.option_text}</span></li>;
                }
              })}
            </ul>
          </div>
        );
      })}
      {error && <div className="variant-validate error text-critical">{error}</div>}
    </div>
  );
}
