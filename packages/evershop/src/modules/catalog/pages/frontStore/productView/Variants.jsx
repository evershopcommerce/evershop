/* eslint-disable no-restricted-syntax */
import PropTypes from 'prop-types';
import React from 'react';
import PubSub from 'pubsub-js';
import { FORM_VALIDATED } from '@evershop/evershop/src/lib/util/events';
import './Variants.scss';
import { useAppDispatch } from '@components/common/context/app';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

const processAttributes = (vs, attributes, currentUrl) => {
  const selectedOptions = [];
  let newAttributes;
  newAttributes = attributes.map((attribute) => {
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search).entries();
    const check = Array.from(params).find(
      ([key, value]) =>
        key === attribute.attributeCode &&
        attribute.options.find(
          (option) => parseInt(option.optionId, 10) === parseInt(value, 10)
        )
    );
    if (check) {
      // Now we need to check if there is a variant with the selected options
      const terms = [
        ...selectedOptions,
        { attributeCode: check[0], optionId: parseInt(check[1], 10) }
      ];
      const variant = vs.items.find((item) =>
        terms.every((attr) =>
          item.attributes.find(
            (term) =>
              term.attributeCode === attr.attributeCode &&
              parseInt(term.optionId, 10) === parseInt(attr.optionId, 10)
          )
        )
      );
      if (variant) {
        selectedOptions.push({
          attributeCode: check[0],
          optionId: parseInt(check[1], 10)
        });
        return {
          ...attribute,
          selected: true,
          selectedOption: parseInt(check[1], 10)
        };
      } else {
        return { ...attribute, selected: false, selectedOption: null };
      }
    } else {
      return { ...attribute, selected: false, selectedOption: null };
    }
  });
  // Loop through the variantAttributes again and find the options that are not available
  newAttributes = newAttributes.map((attribute) => {
    const options = attribute.options.map((option) => {
      const terms = selectedOptions
        .filter(
          (selected) => selected.attributeCode !== attribute.attributeCode
        )
        .concat({
          attributeCode: attribute.attributeCode,
          optionId: option.optionId
        });
      const variant = vs.items.find((item) =>
        terms.every((attr) =>
          item.attributes.find(
            (term) =>
              term.attributeCode === attr.attributeCode &&
              parseInt(term.optionId, 10) === parseInt(attr.optionId, 10)
          )
        )
      );
      if (variant) {
        return { ...option, available: true };
      } else {
        return { ...option, available: false };
      }
    });
    return { ...attribute, options };
  });
  return newAttributes;
};

export default function Variants({
  product: { variantGroup: vs },
  pageInfo: { url: currentProductUrl }
}) {
  const AppContextDispatch = useAppDispatch();
  const [attributes, setAttributes] = React.useState(() =>
    !vs ? [] : processAttributes(vs, vs.variantAttributes, currentProductUrl)
  );
  const [error, setError] = React.useState(null);
  const attributeRef = React.useRef(
    !vs ? [] : processAttributes(vs, vs.variantAttributes, currentProductUrl)
  );
  const validate = (formId, errors) => {
    if (formId !== 'productForm') {
      return true;
    }
    if (attributeRef.current.find((a) => a.selected !== true)) {
      // eslint-disable-next-line no-param-reassign
      errors.variants = 'Missing variant';
      setError(_('Please select variant options'));
      return false;
    } else {
      // eslint-disable-next-line no-param-reassign
      delete errors.variants;
      setError(null);
      return true;
    }
  };

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_VALIDATED, (message, data) => {
      validate(data.formId, data.errors);
    });
    // Listen to the popstate event
    window.addEventListener('popstate', () => {
      const newAttributes = processAttributes(
        vs,
        vs.variantAttributes,
        window.location.href
      );
      setAttributes(() => newAttributes);
      attributeRef.current = newAttributes;
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
      window.removeEventListener('popstate', () => {});
    };
  }, []);

  const onClick = async (attributeCode, optionId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', true);
    url.searchParams.set(attributeCode, optionId);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');
    // eslint-disable-next-line no-restricted-globals
    history.pushState(null, '', url);
    const popStateEvent = new PopStateEvent('popstate');
    dispatchEvent(popStateEvent);
  };

  return (
    <div className="variant variant-container grid grid-cols-1 gap-4 mt-8">
      {attributes.map((a, i) => {
        const options = a.options.filter(
          (v, j, s) =>
            s.findIndex((o) => o.optionId === v.optionId) === j && v.productId
        );
        return (
          <div key={a.attributeCode}>
            <input
              name={`variant_options[${i}][attribute_id]`}
              type="hidden"
              value={a.attributeId || ''}
            />
            <input
              name={`variant_options[${i}][optionId]`}
              type="hidden"
              value={a.selectedOption || ''}
            />
            <div className="mb-2 text-textSubdued uppercase">
              <span>{a.attribute_name}</span>
            </div>
            <ul className="variant-option-list flex justify-start gap-2 flex-wrap">
              {options.map((o) => {
                let className = '';
                if (a.selected && a.selectedOption === o.optionId) {
                  className = 'selected';
                }
                if (o.available === false) {
                  className = 'un-available';
                }
                return (
                  <li key={o.optionId} className={className}>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (o.available === false) {
                          return;
                        }
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
      {error && (
        <div className="variant-validate error text-critical">{error}</div>
      )}
    </div>
  );
}

Variants.propTypes = {
  product: PropTypes.shape({
    variantGroup: PropTypes.shape({
      variantAttributes: PropTypes.arrayOf(
        PropTypes.shape({
          attributeId: PropTypes.number,
          attributeCode: PropTypes.string,
          attributeName: PropTypes.string,
          options: PropTypes.arrayOf(
            PropTypes.shape({
              optionId: PropTypes.number,
              optionText: PropTypes.string,
              productId: PropTypes.number
            })
          )
        })
      ),
      items: PropTypes.arrayOf(
        PropTypes.shape({
          attributes: PropTypes.arrayOf(
            PropTypes.shape({
              attributeCode: PropTypes.string,
              optionId: PropTypes.number
            })
          )
        })
      )
    })
  }).isRequired,
  pageInfo: PropTypes.shape({
    url: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 35
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
