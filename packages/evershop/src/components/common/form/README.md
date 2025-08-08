# React Hook Form Field Wrappers

This directory contains reusable field wrapper components that integrate seamlessly with `react-hook-form`. All components are designed to work within a `FormProvider` context and provide consistent styling, validation, and error handling.

## Available Components

### Form Component

- **Form** - Generic form wrapper with react-hook-form integration

### Basic Input Fields

- **InputField** - Standard text input
- **TextareaField** - Multi-line text input
- **NumberField** - Numeric input with validation
- **EmailField** - Email input with pattern validation
- **PasswordField** - Password input with optional show/hide toggle
- **UrlField** - URL input with pattern validation
- **TelField** - Telephone input with pattern validation

### Date and Time Fields

- **DateField** - Date picker input
- **TimeField** - Time picker input
- **DateTimeLocalField** - Combined date and time picker

### Selection Fields

- **SelectField** - Native HTML select dropdown
- **ReactSelectField** - Enhanced select using react-select
- **CheckboxField** - Single checkbox or multiple checkboxes group
- **RadioGroupField** - Radio button group (supports single radio or radio groups)

### Special Input Fields

- **ColorField** - Color picker with hex input
- **FileField** - File upload with size validation
- **RangeField** - Range slider with value display

## Usage

### Basic Example

```tsx
import {
  Form,
  InputField,
  EmailField,
  PasswordField
} from '@/components/common/reactformhook';

function LoginForm() {
  return (
    <Form
      action="/api/login"
      method="POST"
      onSuccess={(data) => console.log('Login successful', data)}
    >
      <EmailField
        name="email"
        label="Email Address"
        required
        placeholder="Enter your email"
      />

      <PasswordField
        name="password"
        label="Password"
        required
        showToggle
        minLength={8}
      />

      <button type="submit">Login</button>
    </Form>
  );
}
```

### Advanced Form Example

```tsx
import {
  Form,
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  DateField,
  FileField,
  ReactSelectField
} from '@/components/common/reactformhook';

function ProductForm() {
  const categoryOptions = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'books', label: 'Books' }
  ];

  const featureOptions = [
    { value: 'waterproof', label: 'Waterproof' },
    { value: 'wireless', label: 'Wireless' },
    { value: 'rechargeable', label: 'Rechargeable' }
  ];

  return (
    <Form
      action="/api/products"
      method="POST"
      defaultValues={{
        name: '',
        description: '',
        price: 0,
        categories: [],
        features: [],
        releaseDate: '',
        images: null
      }}
    >
      <InputField
        name="name"
        label="Product Name"
        required
        placeholder="Enter product name"
      />

      <TextareaField
        name="description"
        label="Description"
        rows={4}
        placeholder="Enter product description"
      />

      <NumberField
        name="price"
        label="Price ($)"
        required
        min={0}
        step={0.01}
      />

      <ReactSelectField
        name="categories"
        label="Categories"
        options={categoryOptions}
        isMulti
        required
      />

      <CheckboxField
        name="features"
        label="Features"
        options={featureOptions}
        direction="horizontal"
      />

      <DateField name="releaseDate" label="Release Date" required />

      <FileField
        name="images"
        label="Product Images"
        accept="image/*"
        multiple
        maxSize={5 * 1024 * 1024} // 5MB
      />

      <button type="submit">Create Product</button>
    </Form>
  );
}
```

## Component Props

### Common Props (available on all field components)

| Prop        | Type      | Default | Description                                      |
| ----------- | --------- | ------- | ------------------------------------------------ |
| `name`      | `string`  | -       | **Required.** Field name for form registration   |
| `label`     | `string`  | -       | Label text displayed above the field             |
| `className` | `string`  | `''`    | Additional CSS classes                           |
| `required`  | `boolean` | `false` | Whether the field is required                    |
| `disabled`  | `boolean` | `false` | Whether the field is disabled                    |
| `error`     | `string`  | -       | Custom error message (overrides form validation) |

### InputField Props

| Prop          | Type                      | Default  | Description      |
| ------------- | ------------------------- | -------- | ---------------- |
| `placeholder` | `string`                  | -        | Placeholder text |
| `type`        | `string`                  | `'text'` | HTML input type  |
| `onChange`    | `(value: string) => void` | -        | Change handler   |

### NumberField Props

| Prop       | Type                              | Default | Description    |
| ---------- | --------------------------------- | ------- | -------------- |
| `min`      | `number`                          | -       | Minimum value  |
| `max`      | `number`                          | -       | Maximum value  |
| `step`     | `number`                          | -       | Step increment |
| `onChange` | `(value: number \| null) => void` | -       | Change handler |

### EmailField Props

| Prop          | Type                      | Default | Description      |
| ------------- | ------------------------- | ------- | ---------------- |
| `placeholder` | `string`                  | -       | Placeholder text |
| `onChange`    | `(value: string) => void` | -       | Change handler   |

### PasswordField Props

| Prop         | Type                      | Default | Description                     |
| ------------ | ------------------------- | ------- | ------------------------------- |
| `minLength`  | `number`                  | `6`     | Minimum password length         |
| `showToggle` | `boolean`                 | `false` | Show password visibility toggle |
| `onChange`   | `(value: string) => void` | -       | Change handler                  |

### SelectField Props

| Prop       | Type                                    | Default | Description                  |
| ---------- | --------------------------------------- | ------- | ---------------------------- |
| `options`  | `Array<{value: string, label: string}>` | -       | **Required.** Select options |
| `onChange` | `(value: string) => void`               | -       | Change handler               |

### ReactSelectField Props

| Prop          | Type                                    | Default | Description                  |
| ------------- | --------------------------------------- | ------- | ---------------------------- |
| `options`     | `Array<{value: string, label: string}>` | -       | **Required.** Select options |
| `isMulti`     | `boolean`                               | `false` | Allow multiple selections    |
| `isCreatable` | `boolean`                               | `false` | Allow creating new options   |
| `placeholder` | `string`                                | -       | Placeholder text             |
| `onChange`    | `(value: any) => void`                  | -       | Change handler               |

### CheckboxField Props

| Prop           | Type                                                        | Default      | Description                                         |
| -------------- | ----------------------------------------------------------- | ------------ | --------------------------------------------------- |
| `options`      | `Array<{value: string, label: string, disabled?: boolean}>` | -            | Checkbox options (omit for single checkbox)         |
| `direction`    | `'horizontal' \| 'vertical'`                                | `'vertical'` | Layout direction for checkbox group                 |
| `defaultValue` | `boolean \| (string \| number)[]`                           | -            | Default value (boolean for single, array for group) |

### RadioGroupField Props

| Prop        | Type                                                        | Default      | Description                 |
| ----------- | ----------------------------------------------------------- | ------------ | --------------------------- |
| `options`   | `Array<{value: string, label: string, disabled?: boolean}>` | -            | **Required.** Radio options |
| `direction` | `'horizontal' \| 'vertical'`                                | `'vertical'` | Layout direction            |

### DateField Props

| Prop       | Type                      | Default | Description               |
| ---------- | ------------------------- | ------- | ------------------------- |
| `min`      | `string`                  | -       | Minimum date (YYYY-MM-DD) |
| `max`      | `string`                  | -       | Maximum date (YYYY-MM-DD) |
| `onChange` | `(value: string) => void` | -       | Change handler            |

### FileField Props

| Prop       | Type                                | Default | Description                |
| ---------- | ----------------------------------- | ------- | -------------------------- |
| `accept`   | `string`                            | -       | Accepted file types        |
| `multiple` | `boolean`                           | `false` | Allow multiple files       |
| `maxSize`  | `number`                            | -       | Maximum file size in bytes |
| `onChange` | `(files: FileList \| null) => void` | -       | Change handler             |

### RangeField Props

| Prop        | Type                      | Default | Description                 |
| ----------- | ------------------------- | ------- | --------------------------- |
| `min`       | `number`                  | `0`     | Minimum value               |
| `max`       | `number`                  | `100`   | Maximum value               |
| `step`      | `number`                  | `1`     | Step increment              |
| `showValue` | `boolean`                 | `true`  | Show current value in label |
| `onChange`  | `(value: number) => void` | -       | Change handler              |

## Form Component

The `Form` component provides a complete wrapper around react-hook-form with built-in form submission, error handling, and loading states.

### Form Props

| Prop             | Type                                              | Default      | Description                       |
| ---------------- | ------------------------------------------------- | ------------ | --------------------------------- |
| `action`         | `string`                                          | -            | **Required.** Form submission URL |
| `method`         | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'POST'`     | HTTP method                       |
| `defaultValues`  | `object`                                          | `{}`         | Default form values               |
| `validationMode` | `'onChange' \| 'onBlur' \| 'onSubmit'`            | `'onSubmit'` | When to validate                  |
| `onSuccess`      | `(data: any) => void`                             | -            | Success callback                  |
| `onError`        | `(error: any) => void`                            | -            | Error callback                    |
| `loading`        | `boolean`                                         | `false`      | External loading state            |
| `successMessage` | `string`                                          | -            | Custom success message            |
| `errorMessage`   | `string`                                          | -            | Custom error message              |

## CSS Classes

All components use consistent CSS classes for styling:

- `.form-field` - Field container
- `.form-field-label` - Label styling
- `.form-field-input` - Input styling
- `.form-field-error` - Error message styling
- `.form-checkbox` - Checkbox styling
- `.form-radio` - Radio button styling

## Validation

All fields support react-hook-form validation rules. Common patterns:

```tsx
// Required field
<InputField name="name" required />

// Custom validation
<InputField
  name="username"
  required
  validate={{
    minLength: (value) => value.length >= 3 || 'Minimum 3 characters required',
    noSpaces: (value) => !/\s/.test(value) || 'No spaces allowed'
  }}
/>

// Pattern validation (built into EmailField, UrlField, etc.)
<EmailField name="email" required />
```

## Error Handling

Errors are automatically displayed below each field. You can also provide custom error messages:

```tsx
<InputField name="name" error="Custom error message" />
```

## Integration with Third-Party Libraries

### React Select

`ReactSelectField` provides seamless integration with react-select:

```tsx
<ReactSelectField
  name="categories"
  options={[
    { value: 'cat1', label: 'Category 1' },
    { value: 'cat2', label: 'Category 2' }
  ]}
  isMulti
  isCreatable
/>
```

### File Uploads

`FileField` provides file upload with validation:

```tsx
<FileField
  name="documents"
  accept=".pdf,.doc,.docx"
  multiple
  maxSize={10 * 1024 * 1024} // 10MB
/>
```

This creates a robust, type-safe form system that's easy to use and extend.

## Default Values in Selection Fields

The selection field components now properly support `defaultValue` props:

### RadioGroupField with defaultValue

```tsx
<RadioGroupField<FormData>
  name="accountType"
  label="Account Type"
  defaultValue="personal" // This will be pre-selected
  options={[
    { value: 'personal', label: 'Personal' },
    { value: 'business', label: 'Business' }
  ]}
/>
```

### CheckboxField with defaultValue (Group)

```tsx
<CheckboxField<FormData>
  name="interests"
  label="Interests"
  defaultValue={['tech', 'music']} // These will be pre-checked
  options={[
    { value: 'tech', label: 'Technology' },
    { value: 'sports', label: 'Sports' },
    { value: 'music', label: 'Music' }
  ]}
/>
```

### CheckboxField with defaultValue (Single)

```tsx
<CheckboxField<FormData>
  name="newsletter"
  label="Subscribe to newsletter"
  defaultValue={true} // This will be pre-checked
/>
```

## Default Values Best Practices

- For **radio buttons**, ensure the `defaultValue` matches one of the option values.
- For **checkbox groups**, set `defaultValue` to an array of values that should be pre-checked.
- For **single checkboxes**, `defaultValue` should be a boolean indicating the checked state.
