import { Card } from '@components/admin/Card.js';
import Spinner from '@components/admin/Spinner.jsx';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import Select from 'react-select';
import { useQuery } from 'urql';
import { get } from '../../../../../lib/util/get.js';
import './General.scss';

const GroupsQuery = `
  query Query {
    attributeGroups {
      items {
        value: attributeGroupId
        label: groupName
      }
    }
  }
`;
interface Group {
  value: string;
  label: string;
  attributes: {
    items: {
      attributeId: string;
      attributeName: string;
      attributeCode: string;
      type: string;
      isRequired: number;
      options: {
        optionId: string;
        optionText: string;
      }[];
    }[];
  };
}
const Groups: React.FC<{ groups: Group[]; createGroupApi: string }> = ({
  groups,
  createGroupApi
}) => {
  const [result, reexecuteQuery] = useQuery({
    query: GroupsQuery
  });
  const { control } = useFormContext();
  const newGroup = React.useRef<HTMLInputElement | null>(null);
  const [createGroupError, setCreateGroupError] = React.useState<string | null>(
    null
  );
  const { data, fetching, error } = result;

  const createGroup = () => {
    if (!newGroup.current?.value) {
      setCreateGroupError('Group name is required');
      return;
    }
    fetch(createGroupApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ group_name: newGroup.current.value })
    })
      .then((response) => response.json())
      .then((jsonData) => {
        if (!jsonData.error) {
          newGroup.current!.value = '';
          setCreateGroupError(null);
          reexecuteQuery({ requestPolicy: 'network-only' });
        } else {
          setCreateGroupError(jsonData.error.message);
        }
      });
  };

  if (fetching)
    return (
      <div>
        <Spinner width={20} height={20} />
      </div>
    );
  if (error) {
    return <p className="text-red-500">{error.message}</p>;
  }

  return (
    <div>
      <div className="mb-2">Select groups the attribute belongs to</div>
      <div className="grid gap-5 grid-cols-2">
        <div>
          <Controller
            name="groups"
            control={control}
            defaultValue={groups.map((group) => group.value)}
            render={({ field }) => (
              <Select
                {...field}
                options={data.attributeGroups.items}
                hideSelectedOptions
                isMulti
                onChange={(selectedOptions) => {
                  field.onChange(
                    selectedOptions.map((option) => option.value) || []
                  );
                }}
                value={data.attributeGroups.items.filter((item) =>
                  field.value.includes(item.value)
                )}
              />
            )}
          />
        </div>
        <div className="grid gap-5 grid-cols-1">
          <div>
            <div className="flex gap-5">
              <input
                type="text"
                placeholder="Create a new group"
                ref={newGroup}
                className="flex-1 border border-gray-300 rounded-l-md p-2"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  createGroup();
                }}
                className="px-2 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <svg
                  width="1.5rem"
                  height="1.5rem"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
            {createGroupError && (
              <p className="text-red-500 text-xs mt-1">{createGroupError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Options: React.FC<{
  originOptions?: Array<{ optionId: string; optionText: string; uuid: string }>;
}> = ({ originOptions = [] }) => {
  const { control } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray({
    name: 'options',
    control
  });

  React.useEffect(() => {
    replace(
      originOptions.map((option) => ({
        option_text: option.optionText,
        option_id: option.optionId,
        uuid: option.uuid
      }))
    );
  }, []);

  const addOption = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    append({
      option_text: '',
      option_id: (
        Math.floor(Math.random() * (9000000 - 1000000)) + 1000000
      ).toString(),
      uuid: crypto.randomUUID()
    });
  };

  return (
    <div className="attribute-edit-options">
      {fields.map((field, index) => {
        return (
          <div key={field.id} className="flex items-center mb-2 space-x-5">
            <div className="flex-1">
              <InputField
                name={`options.${index}.option_text`}
                placeholder="Option text"
                validation={{ required: 'Option text is required' }}
                wrapperClassName="form-field mb-0"
              />
              <InputField
                type="hidden"
                name={`options.${index}.option_id`}
                wrapperClassName="form-field mb-0"
              />
            </div>
            <div className="self-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  remove(index);
                }}
                className="text-red-500 hover:underline"
              >
                Remove option
              </button>
            </div>
          </div>
        );
      })}
      <div className="mt-2">
        <button
          type="button"
          onClick={addOption}
          className="text-blue-500 hover:underline"
        >
          Add option
        </button>
      </div>
    </div>
  );
};

interface GeneralProps {
  attribute?: {
    type?: string;
    attributeId?: string;
    attributeName?: string;
    attributeCode?: string;
    options?: {
      optionId: string;
      uuid: string;
      optionText: string;
    }[];
    groups?: {
      items: {
        value: string;
        label: string;
      }[];
    };
  };
  createGroupApi: string;
}

export default function General({ attribute, createGroupApi }: GeneralProps) {
  const { register } = useFormContext();
  const [type, setType] = React.useState(attribute?.type || 'text');

  return (
    <Card title="General">
      <Card.Session>
        <div className="space-y-2">
          <InputField
            name="attribute_name"
            label="Name"
            placeholder="Enter attribute name"
            required
            defaultValue={attribute?.attributeName}
            validation={{ required: 'Attribute name is required' }}
          />

          <InputField
            name="attribute_code"
            label="Code"
            placeholder="Enter attribute code"
            required
            defaultValue={attribute?.attributeCode}
            validation={{ required: 'Attribute code is required' }}
            helperText="Attribute code is used in API and must be unique"
          />

          <div>
            <div className="space-y-2">
              <RadioGroupField
                name="type"
                options={[
                  { label: 'Text', value: 'text' },
                  { label: 'Select', value: 'select' },
                  { label: 'Multiselect', value: 'multiselect' },
                  { label: 'Textarea', value: 'textarea' }
                ]}
                label="Type"
                defaultValue={attribute?.type}
                required
                validation={{ required: 'Type is required' }}
              />
            </div>
          </div>
        </div>
      </Card.Session>
      {['select', 'multiselect'].includes(type) && (
        <Card.Session title="Attribute options">
          <Options originOptions={get(attribute, 'options', [])} />
        </Card.Session>
      )}
      <Card.Session title="Attribute Group">
        <Groups
          groups={get(attribute, 'groups.items', [])}
          createGroupApi={createGroupApi}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      attributeName
      attributeCode
      type
      options {
        optionId: attributeOptionId
        uuid
        optionText
      }
      groups {
        items {
          value: attributeGroupId
          label: groupName
        }
      }
    }
    createGroupApi: url(routeId: "createAttributeGroup")
  }
`;
