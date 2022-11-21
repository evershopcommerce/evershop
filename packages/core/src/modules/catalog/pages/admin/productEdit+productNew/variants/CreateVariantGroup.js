import React from 'react';
import { Field } from '../../../../../../lib/components/form/Field';
import { Variants } from './Variants';
import { useQuery } from 'urql';
import { useFormContext } from '../../../../../../lib/components/form/Form';

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

export function CreateVariantGroup() {
  const formContext = useFormContext();
  // Get the current value of attribute_group_id from the form context
  const groupField = (formContext?.fields || []).find((f) => f.name === 'group_id');
  const [attributes, setAttributes] = React.useState([]);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setCreating(false);
  }, [groupField?.value]);

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
  };

  const shouldPause = groupField === undefined || groupField === null ||
    !groupField.value;

  const [result, reexecuteQuery] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        { key: 'type', operation: '=', value: 'select' },
        { key: 'group', operation: '=', value: groupField?.value },
      ]
    },
    pause: shouldPause,
  });
  const { data, fetching, error } = result;
  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div>
      {creating === true && (
        <Variants
          variantProducts={[]}
          variantAttributes={(data?.attributes?.items || []).filter(
            (v) => attributes.includes(v.attributeId)
          )}
        />
      )}
      {creating === false && (
        <div>
          {(data?.attributes?.items || []).length > 0 && (
            <div>
              <div><span>Select the list of attribute</span></div>
              {(data?.attributes?.items || []).map((a) => (
                <Field
                  key={a.attributeCode}
                  type="checkbox"
                  label={a.attributeName}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAttributes(attributes.concat(a.attributeId));
                    } else {
                      setAttributes(attributes.filter((attr) => a !== attr.attributeId));
                    }
                  }}
                />
              ))}
              <div className="mt-1">
                <a className="text-interactive hover:underline" href="#" onClick={(e) => onCreate(e)}>Create</a>
              </div>
            </div>
          )}
          {(data?.attributes?.items || []).length === 0 && (
            <div className="alert alert-danger" role="alert">
              There is no &quot;Select&quot; attribute available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
