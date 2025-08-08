import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import './Variants.scss';
import { useAppDispatch } from '@components/common/context/app.js';
import { _ } from '../../../../../lib/locale/translate/_.js';

export interface VariantGroupAttribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  options: {
    optionId: number;
    optionText: string;
    productId?: number;
    available?: boolean;
  }[];
}

export interface VariantGroup {
  variantAttributes: VariantGroupAttribute[];
  items: {
    attributes: {
      attributeCode: string;
      optionId: number;
    }[];
  }[];
}

const processAttributes = (
  vs,
  attributes: VariantGroupAttribute[],
  currentUrl
) => {
  const selectedOptions: { attributeCode: string; optionId: number }[] = [];
  let newAttributes;
  newAttributes = attributes.map((attribute) => {
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search).entries();
    const check = Array.from(params).find(
      ([key, value]) =>
        key === attribute.attributeCode &&
        attribute.options.find(
          (option) => option.optionId === parseInt(value, 10)
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
              parseInt(term.optionId, 10) ===
                parseInt(attr.optionId.toString(), 10)
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
              term.optionId === attr.optionId
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

export interface VariantsProps {
  product: {
    variantGroup: VariantGroup;
  };
  pageInfo: {
    url: string;
  };
}

export default function Variants({
  product: { variantGroup: vs },
  pageInfo: { url: currentProductUrl }
}: VariantsProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext();
  const AppContextDispatch = useAppDispatch();
  const [attributes, setAttributes] = React.useState(() =>
    !vs ? [] : processAttributes(vs, vs.variantAttributes, currentProductUrl)
  );
  const attributeRef = React.useRef(
    !vs ? [] : processAttributes(vs, vs.variantAttributes, currentProductUrl)
  );
  const validate = () => {
    if (attributeRef.current.find((a) => a.selected !== true)) {
      return false;
    } else {
      return true;
    }
  };

  useEffect(() => {
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
      window.removeEventListener('popstate', () => {});
    };
  }, []);

  const onClick = async (attributeCode, optionId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'true');
    url.searchParams.set(attributeCode, optionId);
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');

    history.pushState(null, '', url);
    const popStateEvent = new PopStateEvent('popstate');
    dispatchEvent(popStateEvent);
  };

  return (
    <div className="variant variant-container grid grid-cols-1 gap-2 mt-5">
      {attributes.map((a, i) => {
        const options = a.options.filter(
          (v, j, s) =>
            s.findIndex((o) => o.optionId === v.optionId) === j && v.productId
        );
        return (
          <div key={a.attributeCode}>
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
      <input
        type="hidden"
        {...register('variant_selected', {
          validate: validate
        })}
      />
      {errors.variant_selected && (
        <div className="text-critical">
          {_('Please select variant options')}
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'productSinglePageForm',
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
