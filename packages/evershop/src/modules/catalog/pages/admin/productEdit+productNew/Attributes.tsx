import { InputField } from '@components/common/form/InputField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import {
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@components/common/ui/Table.js';
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
  const { fields, remove, append } = useFieldArray<FormValues>({
    name: 'attributes'
  });
  const attributeIndex = product?.attributeIndex || [];
  const currentGroup = watch(
    'group_id',
    getGroup(items, product?.groupId)?.groupId || undefined
  );
  useEffect(() => {
    if (currentGroup) {
      // Unregister all existing attribute fields
      fields.forEach((field, index) => {
        unregister(`attributes.${index}`);
      });

      // Remove all existing fields
      remove();

      // Get new attributes for the selected group
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

      // Append new fields
      append(newFields);
    }
  }, [currentGroup, items, append, remove, unregister]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Attribute group')}</CardTitle>
        <CardDescription>{_('Manage the attributes.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {product?.variantGroupId && (
            <div className="flex flex-col">
              <InputField
                type="hidden"
                defaultValue={product?.groupId}
                name="group_id"
              />
              <div>
                <span className="font-semibold">
                  {getGroup(items, product?.groupId).groupName}
                </span>
                <p className="text-muted-foreground italic">
                  {_(
                    'Can not change the attribute group of a product that is already in a variant group.'
                  )}
                </p>
              </div>
            </div>
          )}
          {!product?.variantGroupId && (
            <SelectField
              name="group_id"
              label={_('Attribute group')}
              options={items.map((group) => ({
                value: group.groupId,
                label: group.groupName
              }))}
              defaultValue={product?.groupId || currentGroup}
              required
            />
          )}
        </div>
      </CardContent>
      <CardContent>
        <Table>
          <TableBody>
            {fields.map((attribute, index) => {
              const validation =
                attribute.is_required === 1
                  ? {
                      required: _('${name} is required', {
                        name: attribute.attribute_name
                      })
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
                      placeholder={_('Select an option')}
                      validation={validation}
                    />
                  );
                  break;
                case 'multiselect':
                  Field = (
                    <ReactSelectField
                      name={`attributes.${index}.value`}
                      options={getAttributeOptions(
                        items,
                        attribute.attribute_id
                      )}
                      placeholder={_('Select options')}
                      required={attribute.is_required === 1}
                      validation={validation}
                      isMulti
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
                <TableRow key={attribute.id}>
                  <TableCell>
                    <span>{attribute.attribute_name}</span>
                    {attribute.is_required === 1 && (
                      <span className="text-destructive pl-1">*</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <InputField
                      type="hidden"
                      value={attribute.attribute_code}
                      name={`attributes.${index}.attribute_code`}
                    />
                    {Field}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
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
