import React from 'react';
import { Field } from '../../../../../../lib/components/form/Field';
import { Variants } from './Variants';

export function CreateVariantGroup({ variantableAttributes }) {
  const [attributes, setAttributes] = React.useState([]);
  const [creating, setCreating] = React.useState(false);

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
  };

  return (
    <div>
      {creating === true && (
        <Variants
          variantProducts={[]}
          variantAttributes={variantableAttributes.filter(
            (v) => attributes.includes(v.attribute_id)
          )}
        />
      )}
      {creating === false && (
        <div>
          {variantableAttributes.length > 0 && (
            <div>
              <div><span>Select the list of attribute</span></div>
              {variantableAttributes.map((a) => (
                <Field
                  key={a.attribute_id}
                  type="checkbox"
                  label={a.attribute_name}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAttributes(attributes.concat(a.attribute_id));
                    } else {
                      setAttributes(attributes.filter((attr) => a !== attr.attribute_id));
                    }
                  }}
                />
              ))}
              <div className="mt-1">
                <a className="text-interactive hover:underline" href="#" onClick={(e) => onCreate(e)}>Create</a>
              </div>
            </div>
          )}
          {variantableAttributes.length === 0 && (
            <div className="alert alert-danger" role="alert">
              There is no &quot;Select&quot; attribute available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
