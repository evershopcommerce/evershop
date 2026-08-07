import { Card } from '@components/admin/Card.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';
import { useFormContext, Controller, Control } from 'react-hook-form';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const components = {
  DropdownIndicator: null
};

const createOption = (label) => ({
  label,
  value: label
});

const AreaInput: React.FC<{
  values: {
    label: string;
    value: string;
  }[];
  control: Control<any>;
}> = ({ values, control }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleKeyDown = (event, onChange, value) => {
    if (!inputValue) return;
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        const newOption = createOption(inputValue);
        onChange([...value, newOption]);
        setInputValue('');
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  return (
    <Controller
      name="area"
      control={control}
      defaultValue={values.map((v) => v.value)}
      render={({ field }) => (
        <CreatableSelect
          components={components}
          inputValue={inputValue}
          isClearable
          isMulti
          menuIsOpen={false}
          onChange={(newValue) => {
            const stringArray = newValue
              ? newValue.map((option) => option.value)
              : [];
            field.onChange(stringArray);
          }}
          onInputChange={(newValue) => setInputValue(newValue)}
          onKeyDown={(event) =>
            handleKeyDown(
              event,
              (newOptions) => {
                const stringArray = newOptions.map((option) => option.value);
                field.onChange(stringArray);
              },
              field.value
                ? field.value.map((val) =>
                    typeof val === 'string' ? createOption(val) : val
                  )
                : []
            )
          }
          placeholder="Type area and press enter..."
          value={
            field.value
              ? field.value.map((val) =>
                  typeof val === 'string' ? createOption(val) : val
                )
              : []
          }
        />
      )}
    />
  );
};

interface GeneralProps {
  widget?: {
    name?: string;
    status?: number;
    sortOrder?: number;
    area?: string[];
    route?: string[];
  };
  routes: Array<{
    value: string;
    label: string;
    isApi: boolean;
    isAdmin: boolean;
    method: string[];
  }>;
}

export default function General({ widget, routes }: GeneralProps) {
  const { register, control } = useFormContext();
  const allRoutes = [
    {
      value: 'all',
      label: 'All',
      isAdmin: false,
      isApi: false,
      method: ['GET']
    },
    ...routes
  ];

  return (
    <Card>
      <Card.Session title="Name">
        <InputField
          name="name"
          defaultValue={widget?.name}
          required
          validation={{ required: 'Name is required' }}
          placeholder="Name"
        />
      </Card.Session>
      <Card.Session title="Status">
        <RadioGroupField
          name="status"
          defaultValue={widget?.status}
          required
          validation={{ required: 'Status is required' }}
          options={[
            { value: 0, label: 'Disabled' },
            { value: 1, label: 'Enabled' }
          ]}
        />
      </Card.Session>
      <Card.Session title="Area">
        <AreaInput
          control={control}
          values={
            widget?.area?.length
              ? widget.area.map((a) => ({ value: a, label: a }))
              : []
          }
        />
      </Card.Session>
      <Card.Session title="Page">
        <Controller
          name="route"
          control={control}
          defaultValue={
            widget?.route
              ? widget.route // Keep as string array
              : []
          }
          render={({ field }) => (
            <Select
              options={allRoutes.filter(
                (r) =>
                  r.isApi === false &&
                  r.isAdmin === false &&
                  r.method.includes('GET') &&
                  r.method.length === 1
              )}
              hideSelectedOptions
              isMulti
              aria-label="Select pages"
              onChange={(selectedOptions) => {
                const stringArray = selectedOptions
                  ? selectedOptions.map((option) => option.value)
                  : [];
                field.onChange(stringArray);
              }}
              value={allRoutes.filter((r) => field.value?.includes(r.value))}
              className="page-select relative z-50"
            />
          )}
        />
      </Card.Session>
      <Card.Session title="Sort order">
        <NumberField
          name="sort_order"
          defaultValue={widget?.sortOrder}
          placeholder="Sort Order"
          validation={{
            required: 'Sort order is required',
            min: {
              value: 0,
              message: 'Sort order must be a positive number'
            }
          }}
          required
          helperText="The order in which this widget will be displayed. Lower numbers appear first."
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    widget(id: getContextValue("widgetId", null)) {
      name
      status
      sortOrder
      area
      route
    }
    routes {
      value: id
      label: name
      isApi
      isAdmin
      method
    }
  }
`;
