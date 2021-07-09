import React from "react";
import Text from "../../../../../../lib/components/form/fields/text";
import Select from "../../../../../../lib/components/form/fields/select";
import Date from "../../../../../../lib/components/form/fields/date";
import Datetime from "../../../../../../lib/components/form/fields/datetime";
import Textarea from "../../../../../../lib/components/form/fields/textarea";
import Multiselect from "../../../../../../lib/components/form/fields/multiselect";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

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

    return (
        <div className="product-edit-attribute sml-block">
            <div className="sml-block-title">Attribute</div>
            <div>
                <Select
                    name="group_id"
                    label={"Attribute groups"}
                    value={group["attribute_group_id"]}
                    handler={(e) => setGroup(getGroup(e.target.value))}
                    options={(() => {
                        return attributeGroups.map((g, i) => { return { value: parseInt(g.attribute_group_id), text: g.group_name } })
                    })()}
                />
            </div>
            <table className="table table-bordered">
                <tbody>
                    {group.attributes.map((attribute, index) => {
                        let field = null;
                        switch (attribute.type) {
                            case 'text':
                                field = <Text
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                />;
                                break;
                            case 'date':
                                field = <Date
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                />;
                                break;
                            case 'datetime':
                                field = <Datetime
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                />;
                                break;
                            case 'textarea':
                                field = <Textarea
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                />;
                                break;
                            case 'select':
                                field = <Select
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.selected_option}
                                    options={(() => {
                                        return attribute.options.map((o, i) => { return { value: o.attribute_option_id, text: o.option_text } })
                                    })()}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                    handler={(e) => {
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
                                />;
                                break;
                            case 'multiselect':
                                field = <Multiselect
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.selected_option}
                                    options={(() => {
                                        return attribute.options.map((o, i) => { return { value: o.attribute_option_id, text: o.option_text } })
                                    })()}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
                                />;
                                break;
                            default:
                                field = <Text
                                    name={'attributes[' + attribute.attribute_code + ']'}
                                    value={attribute.value_text}
                                    validationRules={parseInt(attribute.is_required) === 1 ? ['notEmpty'] : []}
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
        </div>
    );
}