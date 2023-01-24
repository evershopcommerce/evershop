/* eslint-disable no-restricted-syntax */
import React from 'react';
import PubSub from 'pubsub-js';
import { FORM_VALIDATED } from '../../../../../lib/util/events';
import './Variants.scss';
import { useAppDispatch } from '../../../../../lib/context/app';

export default function Variants({
  product: {
    variantGroup: vs
  },
  pageInfo: {
    url: currentProductUrl
  }
}) {
  const AppContextDispatch = useAppDispatch();
  const [attributes, setAttributes] = React.useState(() => {
    if (!vs) {
      return [];
    } else {
      return vs.variantAttributes.map((attribute) => {
        const url = new URL(currentProductUrl);
        const params = new URLSearchParams(url.search).entries();
        const check = Array.from(params).find(
          ([key, value]) => key === attribute.attributeCode
            && attribute.options.find((option) => parseInt(option.optionId) === parseInt(value))
        );
        if (check) {
          return { ...attribute, selected: true, selectedOption: parseInt(check[1]) };
        } else {
          return { ...attribute, selected: false, selectedOption: null };
        }
      });
    }
  });
  const attributesRef = React.useRef();
  attributesRef.current = attributes;

  const [error, setError] = React.useState(null);

  const validate = (formId, errors) => {
    if (formId !== 'productForm') {
      return true;
    }
    const attributes = attributesRef.current;
    if (attributes.find((a) => a.selected === false)) {
      // eslint-disable-next-line no-param-reassign
      errors.variants = 'Missing variant';
      setError('Please select variant option');
      return false;
    } else {
      delete errors.variants;
      setError(null);
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

  const onClick = async (attributeCode, optionId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', true);
    url.searchParams.set(attributeCode, optionId);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    history.pushState(null, '', url);
    setAttributes((previous) => previous.map((a) => {
      if (a.attributeCode === attributeCode) {
        return { ...a, selected: true, selectedOption: optionId };
      }
      return a;
    }));
  };

  return (
    <div className="variant variant-container grid grid-cols-1 gap-1 mt-2">
      {attributes.map((a, i) => {
        const options = a.options.filter(
          (v, j, s) => s.findIndex((o) => o.optionId === v.optionId) === j &&
            v.productId
        );
        return (
          <div key={a.attributeCode}>
            <input
              name={`variant_options[${i}][attribute_id]`}
              type="hidden"
              value={a.attributeId}
            />
            <input
              name={`variant_options[${i}][optionId]`}
              type="hidden"
              value={a.selectedOption}
            />
            <div className="mb-05 text-textSubdued uppercase">
              <span>{a.attribute_name}</span>
            </div>
            <ul className="variant-option-list flex justify-start">
              {options.map((o) => {
                let className = 'mr-05';
                if (a.selected && a.selectedOption === o.optionId) {
                  className = 'selected mr-05';
                }
                return (
                  <li key={o.optionId} className={className}>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        await onClick(a.attributeCode, o.optionId);
                      }}
                    >
                      {o.optionText}
                    </a>
                  </li>
                );
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
  areaId: 'productPageMiddleRight',
  sortOrder: 40
};

export const query = `
query Query {
  pageInfo {
    url
  }
  product(id: getContextValue('productId')) {
    variantGroup {
      variantAttributes {
        attributeId
        attributeCode
        attributeName
        options {
          optionId
          optionText
          productId
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
`;
