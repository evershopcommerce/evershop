import Spinner from '@components/admin/Spinner.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { VariantGroup } from '../VariantGroup.js';

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

interface Attribute {
  attributeId: number;
  attributeCode: string;
  attributeName: string;
  options: Array<{
    value: number;
    text: string;
  }>;
}
export const CreateVariantGroup: React.FC<{
  currentProductUuid: string;
  createVariantGroupApi: string;
  setGroup: (group: VariantGroup) => void;
}> = ({ currentProductUuid, createVariantGroupApi, setGroup }) => {
  const [attributes, setAttributes] = React.useState<string[]>([]);
  const { getValues } = useFormContext();
  const groupId = getValues('group_id');

  const onCreate = async (e) => {
    e.preventDefault();
    const response = await fetch(createVariantGroupApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attribute_codes: attributes.map((a) => a),
        attribute_group_id: groupId
      })
    }).then((r) => r.json());

    if (!response.error) {
      // Call addItemApi to add the current product to the new variant group
      const addItemApi = response.data.addItemApi;
      const addItemResponse = await fetch(addItemApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: currentProductUuid
        })
      }).then((r) => r.json());
      if (addItemResponse.error) {
        toast.error(addItemResponse.error.message);
        return;
      }
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

  const [result] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        { key: 'type', operation: 'eq', value: 'select' },
        { key: 'group', operation: 'eq', value: groupId }
      ]
    },
    pause: !groupId
  });

  const { data, fetching, error } = result as {
    data: {
      attributes: {
        items: Array<Attribute>;
      };
    };
    fetching: boolean;
    error: Error | null;
  };
  if (fetching) {
    return (
      <div className="flex justify-center items-center">
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
              <label key={a.attributeCode} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAttributes(attributes.concat(a.attributeCode));
                    } else {
                      setAttributes(
                        attributes.filter((attr) => a.attributeCode !== attr)
                      );
                    }
                  }}
                />
                <span>{a.attributeName}</span>
              </label>
            ))}
            <div className="mt-5">
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
};
