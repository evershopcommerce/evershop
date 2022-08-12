/* eslint-disable no-param-reassign */
import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Field } from '../../../../../../lib/components/form/Field';
import { Card } from '../../../../../cms/views/admin/Card';

export default function Attributes() {
  const context = useAppState();
  const attributeGroups = get(context, 'attributeData');
  const selectedGroup = get(context, 'product.group_id');
  const productAtributes = get(context, 'product.attributes', []);

  const getGroup = (groupId) => {
    const group = attributeGroups.find(
      (g) => parseInt(g.attribute_group_id, 10) === parseInt(groupId, 10)
    );
    const { attributes } = group;
    return {
      ...group,
      attributes: attributes.map((a) => {
        let selected_option = '';
        let value_text = '';
        productAtributes.forEach((v) => {
          if (parseInt(v.attribute_id, 10) === parseInt(a.attribute_id, 10)) {
            selected_option = v.option_id;
            value_text = v.option_text;
          }
        });

        return { ...a, selected_option, value_text };
      })
    };
  };

  const [group, setGroup] = React.useState(
    () => getGroup(
      selectedGroup === undefined ? attributeGroups[0].attribute_group_id : selectedGroup
    )
  );

  return (
    <Card>
      <Card.Session
        title="Attribute group"
        subdued
      >
        <div>
          <Field
            name="group_id"
            value={group.attribute_group_id}
            onChange={(e) => setGroup(getGroup(e.target.value))}
            options={(() => attributeGroups.map(
              (g) => ({ value: parseInt(g.attribute_group_id, 10), text: g.group_name })
            ))()}
            type="select"
          />
        </div>
      </Card.Session>
      <Card.Session title="Attributes">
        <table className="table table-auto">
          <tbody>
            {group.attributes.map((attribute) => {
              let field = null;
              switch (attribute.type) {
                case 'text':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.value_text}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="text"
                    />
                  );
                  break;
                case 'date':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.value_text}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="date"
                    />
                  );
                  break;
                case 'datetime':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.value_text}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="datetime"
                    />
                  );
                  break;
                case 'textarea':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.value_text}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="textarea"
                    />
                  );
                  break;
                case 'select':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.selected_option}
                      options={(() => attribute.options.map(
                        (o) => ({ value: o.attribute_option_id, text: o.option_text })
                      ))()}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      onChange={(e) => {
                        e.persist();
                        setGroup((prev) => ({
                          ...prev,
                          attributes: prev.attributes.map((a) => {
                            // eslint-disable-next-line max-len
                            if (parseInt(a.attribute_id, 10) === parseInt(attribute.attribute_id, 10)) {
                              a.selected_option = e.target.value;
                              // eslint-disable-next-line max-len
                              a.value_text = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                            }

                            return a;
                          })
                        }));
                      }}
                      type="select"
                    />
                  );
                  break;
                case 'multiselect':
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.selected_option}
                      options={(() => attribute.options.map(
                        (o) => ({ value: o.attribute_option_id, text: o.option_text })
                      ))()}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="multiselect"
                    />
                  );
                  break;
                default:
                  field = (
                    <Field
                      name={`attributes[${attribute.attribute_code}]`}
                      value={attribute.value_text}
                      validationRules={parseInt(attribute.is_required, 10) === 1 ? ['notEmpty'] : []}
                      type="text"
                    />
                  );
              }
              return (
                <tr key={attribute.attribute_code}>
                  <td>
                    {attribute.attribute_name}
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
