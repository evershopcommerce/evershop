import { Card } from '@components/admin/Card.js';
import { DateField } from '@components/common/form/DateField.js';
import { DateTimeLocalField } from '@components/common/form/DateTimeLocalField.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface Field {
  attribute_id: string;
  attribute_name: string;
  attribute_code: string;
  type: string;
  is_required: number;
}

interface Attribute extends Field {
  options: {
    value: string;
    label: string;
  }[];
}
interface Group {
  groupId: string;
  groupName: string;
  attributes: {
    items: Attribute[];
  };
}
const getGroup = (groups: Group[] = [], groupId: string | undefined) =>
  groups.find((group) => group.groupId === groupId) || groups[0];

const getAttributeOptions = (groups: Group[], attributeId: string) => {
  const attribute = groups
    .find((group) =>
      group.attributes.items.find((attr) => attr.attribute_id === attributeId)
    )
    ?.attributes.items.find((attr) => attr.attribute_id === attributeId);
  return attribute ? attribute.options : [];
};

const getAttributeSelectedValues = (
  attributeIndex,
  attributeId,
  attributeType
) => {
  switch (attributeType) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'datetime':
      return (
        attributeIndex.find((idx) => idx.attributeId === attributeId)
          ?.optionText || ''
      );
    case 'select':
      return (
        attributeIndex
          .find((idx) => idx.attributeId === attributeId)
          ?.optionId.toString() || ''
      );
    case 'multiselect':
      return attributeIndex
        .filter((idx) => idx.attributeId === attributeId)
        .map((idx) => idx.optionId.toString());
    default:
      return '';
  }
};

interface AttributesProps {
  product?: {
    attributeIndex: {
      attributeId: string;
      optionId: number;
      optionText: string;
    }[];
    groupId: string;
    variantGroupId?: string;
  };
  groups: {
    items: Group[];
  };
}

interface FormValues {
  attributes: Field[];
}

export default function Attributes({
  product,
  groups: { items }
}: AttributesProps) {
  const { unregister, watch } = useFormContext();
  const { fields, replace } = useFieldArray<FormValues>({
    name: 'attributes'
  });
  const attributeIndex = product?.attributeIndex || [];
  const currentGroup = watch(
    'group_id',
    getGroup(items, product?.groupId)?.groupId || undefined
  );
  useEffect(() => {
    if (currentGroup) {
      const attributes = getGroup(items, currentGroup)?.attributes.items || [];
      const newFields = attributes.map((attribute) => ({
        attribute_code: attribute.attribute_code,
        attribute_name: attribute.attribute_name,
        type: attribute.type,
        attribute_id: attribute.attribute_id,
        value: getAttributeSelectedValues(
          attributeIndex,
          attribute.attribute_id,
          attribute.type
        ),
        is_required: attribute.is_required
      }));
      replace(newFields);
    }
  }, [currentGroup, items, replace, unregister]);

  return (
    <Card>
      <Card.Session title="Attribute group">
        <div>
          {product?.variantGroupId && (
            <div>
              <InputField
                type="hidden"
                defaultValue={product?.groupId}
                name="group_id"
              />
              <div className="border rounded border-divider p-2">
                <span>{getGroup(items, product?.groupId).groupName}</span>
              </div>
              <div className="italic text-textSubdued">
                Can not change the attribute group of a product that is already
                in a variant group.
              </div>
            </div>
          )}
          {!product?.variantGroupId && (
            <SelectField
              name="group_id"
              label="Attribute group"
              options={items.map((group) => ({
                value: group.groupId,
                label: group.groupName
              }))}
              defaultValue={product?.groupId}
              required
            />
          )}
        </div>
      </Card.Session>
      <Card.Session title="Attributes">
        <table className="table table-auto">
          <tbody>
            {fields.map((attribute, index) => {
              const validation =
                attribute.is_required === 1
                  ? {
                      required: `${attribute.attribute_name} is required`
                    }
                  : {};
              let Field: React.ReactNode = null;
              switch (attribute.type) {
                case 'text':
                  Field = (
                    <InputField
                      name={`attributes.${index}.value`}
                      required={attribute.is_required === 1}
                      validation={validation}
                    />
                  );
                  break;
                case 'textarea':
                  Field = (
                    <TextareaField
                      name={`attributes.${index}.value`}
                      required={attribute.is_required === 1}
                      validation={validation}
                    />
                  );
                  break;
                case 'select':
                  Field = (
                    <SelectField
                      name={`attributes.${index}.value`}
                      options={getAttributeOptions(
                        items,
                        attribute.attribute_id
                      )}
                      placeholder="Select an option"
                      validation={validation}
                    />
                  );
                  break;
                case 'multiselect':
                  Field = (
                    <SelectField
                      name={`attributes.${index}.value`}
                      options={getAttributeOptions(
                        items,
                        attribute.attribute_id
                      )}
                      placeholder="Select options"
                      required={attribute.is_required === 1}
                      validation={validation}
                      multiple
                    />
                  );
                  break;
                default:
                  Field = (
                    <InputField
                      name={`attributes.${index}.value`}
                      required={attribute.is_required === 1}
                      validation={validation}
                      placeholder={_('Enter value for ${attribute}', {
                        attribute: attribute.attribute_name
                      })}
                    />
                  );
                  break;
              }
              return (
                <tr key={attribute.id}>
                  <td>
                    <span>{attribute.attribute_name}</span>
                    {attribute.is_required === 1 && (
                      <span className="required-indicator">*</span>
                    )}
                  </td>
                  <td>
                    <InputField
                      type="hidden"
                      value={attribute.attribute_code}
                      name={`attributes.${index}.attribute_code`}
                    />
                    {Field}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 30
};

export const query = `
  query Query ($filters: [FilterInput!]) {
    product(id: getContextValue("productId", null)) {
      groupId
      variantGroupId
      attributeIndex {
        attributeId
        optionId
        optionText
      }
    },
    groups: attributeGroups(filters: $filters) {
      items {
        groupId: attributeGroupId
        groupName
        attributes {
          items {
            attribute_id: attributeId
            attribute_name: attributeName
            attribute_code: attributeCode
            type
            is_required: isRequired
            options {
              value: attributeOptionId
              label: optionText
            }
          }
        }
      }
    }
  }
`;

export const variables = `
{
  filters: [{ key: "limit", operation: 'eq', value: 1000 }]
}`;
