/* eslint-disable no-param-reassign */
import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';

const getGroup = (groups = [], groupId) => {
  return groups.find((group) => parseInt(group.groupId) === parseInt(groupId)) || groups[0];
};

export default function Attributes({ product, groups }) {
  const attributeIndex = product?.attributeIndex || [];
  const groupId = product?.groupId || undefined;
  const [currentGroup, setCurrentGroup] = React.useState(getGroup(groups, groupId));

  const handleGroupChange = (e) => {
    // Check if product is in a variant group
    if (product?.groupId) {
      // eslint-disable-next-line no-alert
      alert('You can not change the attribute group of a product that is already in a variant group.');
      return;
    } else {
      setCurrentGroup(getGroup(groups, e.target.value));
    }
  }

  return (
    <Card>
      <Card.Session
        title="Attribute group"
        subdued
      >
        <div>
          {product?.variantGroupId && <div>
            <input type='hidden' value={currentGroup.groupId} name={'group_id'} />
            <div className='border rounded border-divider p-1'><span>{currentGroup.groupName}</span></div>
            <div className='italic text-textSubdued'>Can not change the attribute group of a product that is already in a variant group.</div>
          </div>}
          {!product?.variantGroupId && <Field
            name="group_id"
            value={currentGroup.groupId}
            onChange={(e) => handleGroupChange(e)}
            options={(() => groups.map(
              (g) => ({ value: parseInt(g.groupId, 10), text: g.groupName })
            ))()}
            type="select"
          />}
        </div>
      </Card.Session>
      <Card.Session title="Attributes">
        <table className="table table-auto">
          <tbody>
            {currentGroup.attributes.map((attribute) => {
              const valueIndex = attributeIndex.find(idx => idx.attributeId === attribute.attributeId);
              const valueIndexMulti = attributeIndex.filter(idx => idx.attributeId === attribute.attributeId);
              let field = null;
              switch (attribute.type) {
                case 'text':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex?.optionText}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="text"
                    />
                  );
                  break;
                case 'date':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex?.optionText}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="date"
                    />
                  );
                  break;
                case 'datetime':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex?.optionText}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="datetime"
                    />
                  );
                  break;
                case 'textarea':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex?.optionText}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="textarea"
                    />
                  );
                  break;
                case 'select':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex?.optionId}
                      options={(() => attribute.options.map(
                        (o) => ({ value: o.optionId, text: o.optionText })
                      ))()}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      onChange={(e) => {
                        e.persist();
                        // setGroup((prev) => ({
                        //   ...prev,
                        //   attributes: prev.attributes.map((a) => {
                        //     // eslint-disable-next-line max-len
                        //     if (parseInt(a.attribute_id, 10) === parseInt(attribute.attribute_id, 10)) {
                        //       a.selected_option = e.target.value;
                        //       // eslint-disable-next-line max-len
                        //       a.value_text = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                        //     }

                        //     return a;
                        //   })
                        // }));
                      }}
                      type="select"
                    />
                  );
                  break;
                case 'multiselect':
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}][]`}
                      value={valueIndexMulti.map(i => i.optionId)}
                      options={(() => attribute.options.map(
                        (o) => ({ value: o.optionId, text: o.optionText })
                      ))()}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="multiselect"
                    />
                  );
                  break;
                default:
                  field = (
                    <Field
                      name={`attributes[${attribute.attributeCode}]`}
                      value={valueIndex.optionText}
                      validationRules={parseInt(attribute.isRequired, 10) === 1 ? ['notEmpty'] : []}
                      type="text"
                    />
                  );
              }
              return (
                <tr key={attribute.attributeCode}>
                  <td>
                    {attribute.attributeName}
                  </td>
                  <td>
                    {field}
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
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      groupId
      variantGroupId
      attributeIndex {
        attributeId
        optionId
        optionText
      }
    },
    groups: attributeGroups {
      groupId: attributeGroupId
      groupName
      attributes {
        attributeId
        attributeName
        attributeCode
        type
        isRequired
        options {
          optionId: attributeOptionId
          optionText
        }
      }
    }
  }
`;