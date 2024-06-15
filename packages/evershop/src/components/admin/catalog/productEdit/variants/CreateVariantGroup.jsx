import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';
import { Field } from '@components/common/form/Field';
import { useFormContext } from '@components/common/form/Form';
import Spinner from '@components/common/Spinner';

const AttributesQuery = `
  query Query($filters: [FilterInput]) {
    attributes(filters: $filters) {
      items {
        attributeId
        attributeCode
        attributeName
        options {
          value: attributeOptionId
          text: optionText
        }
      }
    }
  }
`;

export function CreateVariantGroup({ createVariantGroupApi, setGroup }) {
  const [attributes, setAttributes] = React.useState([]);
  const formContext = useFormContext();
  // Get the current value of attribute_group_id from the form context
  const groupField = (formContext?.fields || []).find(
    (f) => f.name === 'group_id'
  );

  const onCreate = async (e) => {
    e.preventDefault();
    const response = await fetch(createVariantGroupApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attribute_codes: attributes.map((a) => a),
        attribute_group_id: groupField?.value
      })
    }).then((r) => r.json());

    if (!response.error) {
      setGroup({
        variantGroupId: response.data.variant_group_id,
        addItemApi: response.data.addItemApi,
        attributes: response.data.attributes.map((attribute) => ({
          attributeCode: attribute.attribute_code,
          uuid: attribute.uuid,
          attributeName: attribute.attribute_name,
          attributeId: attribute.attribute_id,
          options: attribute.options.map((option) => ({
            optionId: option.attribute_option_id,
            optionText: option.option_text
          }))
        }))
      });
    } else {
      toast.error(response.error.message);
    }
  };

  const shouldPause =
    groupField === undefined || groupField === null || !groupField.value;

  const [result] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        { key: 'type', operation: 'eq', value: 'select' },
        { key: 'group', operation: 'eq', value: groupField?.value }
      ]
    },
    pause: shouldPause
  });

  const { data, fetching, error } = result;
  if (fetching) {
    return (
      <div className="p-3 flex justify-center items-center border rounded border-divider">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }

  return (
    <div>
      <div>
        {(data?.attributes?.items || []).length > 0 && (
          <div>
            <div>
              <span>Select the list of attribute</span>
            </div>
            {(data?.attributes?.items || []).map((a) => (
              <Field
                key={a.attributeCode}
                type="checkbox"
                label={a.attributeName}
                onChange={(e) => {
                  if (e.target.checked) {
                    setAttributes(attributes.concat(a.attributeCode));
                  } else {
                    setAttributes(
                      attributes.filter((attr) => a !== attr.attributeCode)
                    );
                  }
                }}
              />
            ))}
            <div className="mt-8">
              <a
                className="text-interactive hover:underline"
                href="#"
                onClick={(e) => onCreate(e)}
              >
                Create
              </a>
            </div>
          </div>
        )}
        {(data?.attributes?.items || []).length === 0 && (
          <div className="alert alert-danger" role="alert">
            There is no &quot;Select&quot; attribute available.
          </div>
        )}
      </div>
    </div>
  );
}

CreateVariantGroup.propTypes = {
  createVariantGroupApi: PropTypes.string.isRequired,
  setGroup: PropTypes.func.isRequired
};
