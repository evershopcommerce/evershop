/* eslint-disable camelcase */
/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import { useQuery } from 'urql';
import Area from '@components/common/Area';
import { get } from '@evershop/evershop/src/lib/util/get';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';
import { Input } from '@components/common/form/fields/Input';

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
function Groups({ groups, createGroupApi }) {
  const [result, reexecuteQuery] = useQuery({
    query: GroupsQuery
  });
  const newGroup = React.useRef(null);
  const [createGroupError, setCreateGroupError] = React.useState(null);
  const { data, fetching, error } = result;

  const createGroup = () => {
    if (!newGroup.current.value) {
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
          newGroup.current.value = '';
          reexecuteQuery({ requestPolicy: 'network-only' });
        } else {
          setCreateGroupError(jsonData.error.message);
        }
      });
  };

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">Select groups the attribute belongs to</div>
      <div className="grid gap-8 grid-cols-2">
        <div>
          <Select
            name="groups[]"
            options={data.attributeGroups.items}
            hideSelectedOptions
            isMulti
            defaultValue={groups}
          />
        </div>
        <div className="grid gap-8 grid-cols-1">
          <div>
            <Input
              type="text"
              placeholder="Create a new group"
              ref={newGroup}
              error={createGroupError}
              suffix={
                <a
                  className="text-interactive"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    createGroup();
                  }}
                >
                  <svg
                    width="1.5rem"
                    height="1.5rem"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </a>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

Groups.propTypes = {
  createGroupApi: PropTypes.string.isRequired,
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string
    })
  ).isRequired
};

function Options({ originOptions = [] }) {
  const [options, setOptions] = React.useState(originOptions);

  const addOption = (e) => {
    e.preventDefault();
    setOptions(
      options.concat({
        optionId: Math.floor(Math.random() * (9000000 - 1000000)) + 1000000,
        uuid: Math.floor(Math.random() * (9000000 - 1000000)) + 1000000,
        optionText: ''
      })
    );
  };

  const removeOption = (uuid, e) => {
    e.preventDefault();
    const newOptions = options.filter((option) => option.uuid !== uuid);
    setOptions(newOptions);
  };

  return (
    <div className="attribute-edit-options">
      {options.map((option, index) => {
        const { uuid, optionId, optionText } = option;
        return (
          <div key={uuid} className="flex mb-2 space-x-8">
            <div>
              <Field
                key={uuid}
                type="text"
                name={`options[${index}][option_text]`}
                formId="attribute-edit-form"
                value={optionText}
                validationRules={['notEmpty']}
              />
              <input
                type="hidden"
                name={`options[${index}][option_id]`}
                value={optionId}
              />
            </div>
            <div className="self-center">
              <a
                href="#"
                onClick={(e) => removeOption(uuid, e)}
                className="text-critical hover:underline"
              >
                Remove option
              </a>
            </div>
          </div>
        );
      })}
      <div className="mt-4">
        <a
          href="#"
          onClick={(e) => addOption(e)}
          className="text-interactive hover:underline"
        >
          Add option
        </a>
      </div>
    </div>
  );
}

Options.propTypes = {
  originOptions: PropTypes.arrayOf(
    PropTypes.shape({
      optionId: PropTypes.string,
      optionText: PropTypes.string
    })
  ).isRequired
};

export default function General({ attribute, createGroupApi }) {
  const [type, setType] = React.useState(attribute?.type);
  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'attributeName',
        name: 'attribute_name',
        label: 'Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'attributeCode',
        name: 'attribute_code',
        label: 'Attribute code',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 15
    },
    {
      component: { default: Field },
      props: {
        id: 'attributeId',
        name: 'attribute_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'type',
        type: 'radio',
        name: 'type',
        label: 'Type',
        options: [
          { value: 'text', text: 'Text' },
          { value: 'select', text: 'Select' },
          { value: 'multiselect', text: 'Multiselect' },
          { value: 'textarea', text: 'Textarea' }
        ],
        onChange: (value) => {
          setType(value);
        }
      },
      sortOrder: 20
    }
  ].map((f) => {
    if (get(attribute, `${f.props.id}`) !== undefined) {
      // eslint-disable-next-line no-param-reassign
      f.props.value = get(attribute, `${f.props.id}`);
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="attributeEditGeneral" coreComponents={fields} />
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

General.propTypes = {
  attribute: PropTypes.shape({
    type: PropTypes.string.isRequired,
    attributeId: PropTypes.string,
    attributeName: PropTypes.string,
    attributeCode: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        optionId: PropTypes.string,
        optionText: PropTypes.string
      })
    ),
    groups: PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string,
          label: PropTypes.string
        })
      )
    })
  }),
  createGroupApi: PropTypes.string.isRequired
};

General.defaultProps = {
  attribute: {
    type: 'text'
  }
};

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
