import { useAppDispatch, useAppState } from '@components/common/context/app.js';
import {
  DefaultVariantAttribute,
  DefaultVariantOptionItem
} from '@components/frontStore/catalog/DefaultVariantSelectorRender.js';
import {
  useProduct,
  VariantAttribute,
  VariantGroup,
  AttributeOption
} from '@components/frontStore/catalog/ProductContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

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

export interface VariantOptionItemProps {
  option: AttributeOption & { available: boolean };
  attribute: ProcessedAttribute;
  isSelected: boolean;
  onSelect: (attributeCode: string, optionId: number) => Promise<void>;
}

export interface VariantAttributeGroupProps {
  attribute: ProcessedAttribute;
  options: (AttributeOption & { available: boolean })[];
  onSelect: (attributeCode: string, optionId: number) => Promise<void>;
  OptionItem?: React.ComponentType<VariantOptionItemProps>;
}

interface VariantsProps {
  AttributeRenderer?: React.ComponentType<VariantAttributeGroupProps>;
  OptionRenderer?: React.ComponentType<VariantOptionItemProps>;
}

export function VariantSelector({
  AttributeRenderer = DefaultVariantAttribute,
  OptionRenderer = DefaultVariantOptionItem
}: VariantsProps) {
  const { variantGroup: vs, productId } = useProduct();
  const {
    config: {
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
    const handleProductChange = () => {
      const newAttributes = processAttributes(
        vs,
        vs?.variantAttributes || [],
        currentProductUrl
      );
      setAttributes(newAttributes);
      attributeRef.current = newAttributes;
    };

    handleProductChange();
  }, [vs, productId]);

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
  };

  if (!vs || attributes.length === 0) {
    return null;
  }

  return (
    <div className="variant variant__container grid grid-cols-1 gap-2 mt-5">
      {attributes.map((attribute) => {
        const options = attribute.options.filter(
          (v, j, s) =>
            s.findIndex((o) => o.optionId === v.optionId) === j && v.productId
        );

        return (
          <AttributeRenderer
            key={attribute.attributeCode}
            attribute={attribute}
            options={options}
            onSelect={handleOptionClick}
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
