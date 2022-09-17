/* eslint-disable no-restricted-syntax */
import React from 'react';
import PubSub from 'pubsub-js';
import { FORM_VALIDATED } from '../../../../../lib/util/events';
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
        const option = vAttrs.find((a) => a.attributeCode === attr);
        if (attr !== attributeCode
          && parseInt(option.optionId, 10) !== parseInt(currentFilters[attr], 10)) {
          flag = false;
        }
      }
      if (flag === true) availableVars.push(v);
    });
  }
  return availableVars.find(
    (a) => a.attributes.find(
      (at) => at.attributeCode === attributeCode
        && parseInt(at.optionId, 10) === parseInt(optionId, 10)
    ) !== undefined
  );
}

export default function Variants({ product: { variants: { variantAttributes, items } }, pageInfo: { url } }) {
  const attributes = variantAttributes;
  const variants = items;
  const [error, setError] = React.useState(null);
  const currentProductUrl = url;
  const getCurrentSelection = () => {
    const currentSelection = {};
    const url = new URL(currentProductUrl);
    const params = new URLSearchParams(url.search);
    for (const [key, value] of params.entries()) {
      // Check if the key is a variant attribute
      if (attributes.find((a) => a.attributeCode === key)) {
        currentSelection[key] = value;
      }
    }

    return currentSelection;
  }
  const variantFilters = getCurrentSelection();

  const validate = (formId, errors) => {
    if (formId !== 'productForm') { return true; }

    let flag = true;
    attributes.forEach((a) => {
      if (variantFilters[a.attributeCode] === undefined) { flag = false; }
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
          (v, j, s) => s.findIndex((o) => o.optionId === v.optionId) === j
        );
        return (
          <div key={a.attributeCode}>
            <input name={`variant_options[${i}][attribute_id]`} type="hidden" value={a.attributeId} />
            <input name={`variant_options[${i}][optionId]`} type="hidden" value={variantFilters[a.attributeCode] ? variantFilters[a.attributeCode] : ''} />
            <div className="mb-05 text-textSubdued uppercase"><span>{a.attribute_name}</span></div>
            <ul className="variant-option-list flex justify-start">
              {options.map((o) => {
                let className = 'mr-05';
                if (isSelected(a.attributeCode, o.optionId, variantFilters)) className = 'selected mr-05';
                if (isAvailable(a.attributeCode, o.optionId, variants, variantFilters)) {
                  return (
                    <li key={o.optionId} className={className}>
                      <a href={getUrl(a.attributeCode, o.optionId)}>{o.optionText}</a>
                    </li>
                  );
                } else {
                  return <li key={o.optionId} className="un-available mr-05"><span>{o.optionText}</span></li>;
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

export const layout = {
  areaId: "productPageMiddleRight",
  sortOrder: 40
}

export const query = `
query Query {
  pageInfo {
    url
  }
  product(id: getContextValue('productId)) {
    variants {
      variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
        }
      }
      items {
        attributes {
          attributeCode
          optionId
        }
      }
    }
  }
}
`