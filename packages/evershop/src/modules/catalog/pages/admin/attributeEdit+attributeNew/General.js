/* eslint-disable camelcase */
/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { get } from '../../../../../lib/util/get';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';
import Select from 'react-select';
import { useQuery } from 'urql';
import { Input } from '../../../../../lib/components/form/fields/Input';

const GroupsQuery = `
  query Query {
    attributeGroups {
      value: attributeGroupId
      label: groupName
    }
  }
`
function Groups({ groups, addGroupUrl }) {
  const [result, reexecuteQuery] = useQuery({
    query: GroupsQuery,
  });
  const newGroup = React.useRef(null);
  const [createGroupError, setCreateGroupError] = React.useState(null);
  const { data, fetching, error } = result;

  const createGroup = () => {
    if (!newGroup.current.value) {
      setCreateGroupError("Group name is required");
      return
    }
    fetch(addGroupUrl, {
      method: "POST",
      headers: {
        'Content-Type': "application/json"
      },
      body: JSON.stringify({ group_name: newGroup.current.value })
    }).then(response => response.json())
      .then((data) => {
        if (data.success === true) {
          newGroup.current.value = '';
          reexecuteQuery({ requestPolicy: 'network-only' });
        } else {
          setCreateGroupError(data.message)
        }
      })
  }

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return <div>
    <div className='mb-1'>Select groups the attribute belongs to</div>

    <div className='grid gap-2 grid-cols-2'>
      <div>
        <Select
          name='groups'
          options={data.attributeGroups}
          hideSelectedOptions={true}
          isMulti={true}
          defaultValue={groups}
        />
      </div>
      <div className='grid gap-2 grid-cols-1'>
        <div>
          <Input
            type="text"
            placeholder={"Create a new group"}
            ref={newGroup}
            error={createGroupError}
            suffix={<a className='text-interactive' href="#" onClick={(e) => { e.preventDefault(); createGroup() }}>
              <svg width={'1.5rem'} height={"1.5rem"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>}
          />
        </div>
      </div>
    </div>
  </div>
}

function Options({ originOptions = [] }) {
  const [options, setOptions] = React.useState(originOptions);

  const addOption = (e) => {
    e.preventDefault();
    setOptions(options.concat({
      attributeOptionId: Date.now(),
      optionText: ''
    }));
  };

  const removeOption = (key, e) => {
    e.preventDefault();
    const newOptions = options.filter((_, index) => index !== key);
    setOptions(newOptions);
  };

  return (
    <div className="attribute-edit-options">
      {options.map((option, index) => {
        const { attributeOptionId, optionText } = option;
        return (
          <div key={attributeOptionId} className="flex mb-05 space-x-2">
            <div>
              <Field
                type="text"
                name={`options[${attributeOptionId}][option_text]`}
                formId="attribute-edit-form"
                value={optionText}
                validationRules={['notEmpty']}
              />
            </div>
            <div className="self-center"><a href="#" onClick={(e) => removeOption(index, e)} className="text-critical hover:underline">Remove option</a></div>
          </div>
        );
      })}
      <div className="mt-1"><a href="#" onClick={(e) => addOption(e)} className="text-interactive hover:underline">Add option</a></div>
    </div>
  );
}

Options.propTypes = {
  originOptions: PropTypes.arrayOf(PropTypes.shape({
    attributeOptionId: PropTypes.number,
    optionText: PropTypes.string
  })).isRequired
};

export default function General({ attribute, addGroupUrl }) {
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
    <Card
      title="General"
    >
      <Card.Session>
        <Area id="attributeEditGeneral" coreComponents={fields} />
      </Card.Session>
      {['select', 'multiselect'].includes(type) && (
        <Card.Session title="Attribute options">
          <Options originOptions={get(attribute, 'options', [])} />
        </Card.Session>
      )}
      <Card.Session title="Attribute Group">
        <Groups groups={get(attribute, 'groups', [])} addGroupUrl={addGroupUrl} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
}

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      attributeName
      attributeCode
      type
      options {
        attributeOptionId
        optionText
      }
      groups {
        value: attributeGroupId
        label: groupName
      }
    }
    addGroupUrl: url(routeId: "attributeGroupSavePost")
  }
`;