import React, { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import './Variants.scss';
import { useAppDispatch, useAppState } from '@components/common/context/app.js';
import { _ } from '../../../lib/locale/translate/_.js';
import {
  useProduct,
  VariantAttribute,
  VariantGroup,
  AttributeOption
} from '@components/frontStore/product/productContext.js';

interface SelectedOption {
  attributeCode: string;
  optionId: number;
}

interface ProcessedAttribute extends VariantAttribute {
  selected: boolean;
  selectedOption: number | null;
  options: (AttributeOption & { available: boolean })[];
}

const processAttributes = (
  vs: VariantGroup | undefined,
  attributes: VariantAttribute[],
  currentUrl: string
): ProcessedAttribute[] => {
  if (!vs) return [];

  const selectedOptions: SelectedOption[] = [];
  let newAttributes: ProcessedAttribute[];

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
      const terms = [
        ...selectedOptions,
        { attributeCode: check[0], optionId: parseInt(check[1], 10) }
      ];
      const variant = vs.items.find((item) =>
        terms.every((attr) =>
          item.attributes.find(
            (term) =>
              term.attributeCode === attr.attributeCode &&
              parseInt(term.optionId.toString(), 10) ===
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
        } as ProcessedAttribute;
      } else {
        return {
          ...attribute,
          selected: false,
          selectedOption: null
        } as ProcessedAttribute;
      }
    } else {
      return {
        ...attribute,
        selected: false,
        selectedOption: null
      } as ProcessedAttribute;
    }
  });

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

      return {
        ...option,
        available: !!variant
      };
    });

    return { ...attribute, options };
  });

  return newAttributes;
};

interface VariantOptionItemProps {
  option: AttributeOption & { available: boolean };
  attribute: ProcessedAttribute;
  isSelected: boolean;
  onClick: (attributeCode: string, optionId: number) => Promise<void>;
}

const DefaultVariantOptionItem: React.FC<VariantOptionItemProps> = ({
  option,
  attribute,
  isSelected,
  onClick
}) => {
  let className = '';
  if (isSelected) {
    className = 'selected';
  }
  if (option.available === false) {
    className = 'un-available';
  }

  return (
    <li key={option.optionId} className={className}>
      <a
        href="#"
        onClick={async (e) => {
          e.preventDefault();
          if (option.available === false) {
            return;
          }
          await onClick(attribute.attributeCode, option.optionId);
        }}
      >
        {option.optionText}
      </a>
    </li>
  );
};

interface VariantAttributeGroupProps {
  attribute: ProcessedAttribute;
  options: (AttributeOption & { available: boolean })[];
  onClick: (attributeCode: string, optionId: number) => Promise<void>;
  OptionItem?: React.ComponentType<VariantOptionItemProps>;
}

const DefaultVariantAttributeGroup: React.FC<VariantAttributeGroupProps> = ({
  attribute,
  options,
  onClick,
  OptionItem = DefaultVariantOptionItem
}) => {
  return (
    <div key={attribute.attributeCode}>
      <div className="mb-2 text-textSubdued uppercase">
        <span>{attribute.attributeName}</span>
      </div>
      <ul className="variant-option-list flex justify-start gap-2 flex-wrap">
        {options.map((option) => (
          <OptionItem
            key={option.optionId}
            option={option}
            attribute={attribute}
            isSelected={
              attribute.selected && attribute.selectedOption === option.optionId
            }
            onClick={onClick}
          />
        ))}
      </ul>
    </div>
  );
};

interface VariantsProps {
  AttributeRenderer?: React.ComponentType<VariantAttributeGroupProps>;
  OptionRenderer?: React.ComponentType<VariantOptionItemProps>;
}

export default function Variants({
  AttributeRenderer = DefaultVariantAttributeGroup,
  OptionRenderer = DefaultVariantOptionItem
}: VariantsProps) {
  const { variantGroup: vs } = useProduct();
  const {
    graphqlResponse: {
      pageMeta: {
        route: { url: currentProductUrl }
      }
    }
  } = useAppState();
  const {
    register,
    formState: { errors }
  } = useFormContext();
  const AppContextDispatch = useAppDispatch();

  const initialAttributes = useMemo(
    () => processAttributes(vs, vs?.variantAttributes || [], currentProductUrl),
    [vs, currentProductUrl]
  );

  const [attributes, setAttributes] =
    React.useState<ProcessedAttribute[]>(initialAttributes);
  const attributeRef = React.useRef<ProcessedAttribute[]>(initialAttributes);

  const validate = () => {
    return !attributeRef.current.find((a) => a.selected !== true);
  };

  useEffect(() => {
    const handlePopState = () => {
      const newAttributes = processAttributes(
        vs,
        vs?.variantAttributes || [],
        window.location.href
      );
      setAttributes(newAttributes);
      attributeRef.current = newAttributes;
    };

    window.addEventListener('popstate', handlePopState);

    return function cleanup() {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [vs]);

  const handleOptionClick = async (
    attributeCode: string,
    optionId: number
  ): Promise<void> => {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'true');
    url.searchParams.set(attributeCode, optionId.toString());
    await AppContextDispatch.fetchPageData(url);
    url.searchParams.delete('ajax');

    history.pushState(null, '', url);
    const popStateEvent = new PopStateEvent('popstate');
    dispatchEvent(popStateEvent);
  };

  if (!vs || attributes.length === 0) {
    return null;
  }

  return (
    <div className="variant variant-container grid grid-cols-1 gap-2 mt-5">
      {attributes.map((attribute) => {
        // Filter unique options with product IDs
        const options = attribute.options.filter(
          (v, j, s) =>
            s.findIndex((o) => o.optionId === v.optionId) === j && v.productId
        );

        return (
          <AttributeRenderer
            key={attribute.attributeCode}
            attribute={attribute}
            options={options}
            onClick={handleOptionClick}
            OptionItem={OptionRenderer}
          />
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
