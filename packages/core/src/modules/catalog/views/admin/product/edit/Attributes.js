import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Field } from "../../../../../../lib/components/form/Field";
import { Card } from "../../../../../cms/views/admin/Card";

export default function Attributes() {
    const context = useAppState();
    const attributeGroups = get(context, "attributeData");
    const selectedGroup = get(context, "product.group_id");
    const productAtributes = get(context, "product.attributes", []);

    const getGroup = (groupId) => {
        let group = attributeGroups.find(g => parseInt(g.attribute_group_id) === parseInt(groupId));
        let attributes = group['attributes'];
        return {
            ...group, attributes: attributes.map((a, i) => {
                a['selected_option'] = '';
                a['value_text'] = '';
                productAtributes.forEach(function (v) {
                    if (parseInt(v['attribute_id']) === parseInt(a['attribute_id'])) {
                        a['selected_option'] = v['option_id'];
                        a['value_text'] = v['option_text'];
                    }
                });

                return a;
            })
        };
    };

    const [group, setGroup] = React.useState(() => {
        return getGroup(selectedGroup === undefined ? attributeGroups[0]["attribute_group_id"] : selectedGroup);
    });

    return <Card>
        <Card.Session
            title='Attribute group'
            subdued={true}
        >
            <div>
                <Field
                    name="group_id"
                    value={group["attribute_group_id"]}
                    onChange={(e) => setGroup(getGroup(e.target.value))}
                    options={(() => {
                        return attributeGroups.map((g, i) => { return { value: parseInt(g.attribute_group_id), text: g.group_name } })
                    })()}
                    type='select'
                />
            </div>
        </Card.Session>
        <Card.Session title='Attributes'>
            <table className="table table-auto">
                <tbody>
                    {group.attributes.map((attribute, index) => {
                        let field = null;
                        switch (attribute.type) {
                            case 'text':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='text'
                                />;
                                break;
                            case 'date':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='date'
                                />;
                                break;
                            case 'datetime':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='datetime'
                                />;
                                break;
                            case 'textarea':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='textarea'
                                />;
                                break;
                            case 'select':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.selected_option}
                                    options={(() => {
                                        return attribute.options.map((o, i) => { return { value: o.attribute_option_id, text: o.option_text } })
                                    })()}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    onChange={(e) => {
                                        e.persist();
                                        setGroup(prev => {
                                            return {
                                                ...prev, attributes: prev.attributes.map(a => {
                                                    if (parseInt(a['attribute_id']) === parseInt(attribute['attribute_id'])) {
                                                        a['selected_option'] = e.target.value;
                                                        a['value_text'] = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                                                    }

                                                    return a;
                                                })
                                            }
                                        });
                                    }}
                                    type='select'
                                />;
                                break;
                            case 'multiselect':
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.selected_option}
                                    options={(() => {
                                        return attribute.options.map((o, i) => { return { value: o.attribute_option_id, text: o.option_text } })
                                    })()}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='multiselect'
                                />;
                                break;
                            default:
                                field = <Field
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    type='text'
                                />;
                        }
                        return <tr key={attribute.attribute_code}>
                            <td>
                                {attribute.attribute_name}
                            </td>
                            <td>
                                {field}
                            </td>
                        </tr>
                    })}
                </tbody>
            </table>
        </Card.Session>
    </Card>;
}