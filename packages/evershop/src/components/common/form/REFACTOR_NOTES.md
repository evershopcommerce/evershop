# Field Component Refactoring Notes

## Overview

We're refactoring all field components to use a clean wrapper class approach that allows for easy styling customization.

## ✅ Completed Components

- [x] InputField
- [x] NumberField
- [x] EmailField
- [x] PasswordField
- [x] CheckboxField
- [x] RadioGroupField
- [x] SelectField
- [x] TextareaField
- [x] UrlField
- [x] TelField
- [x] DateField
- [x] TimeField
- [x] DateTimeLocalField
- [x] ColorField
- [x] FileField
- [x] RangeField
- [x] ReactSelectField
- [x] ReactSelectCreatableField

## 🔄 In Progress Components

All components have been refactored!

## Refactoring Pattern

Each component should follow this pattern:

### 1. Interface Update

Add `wrapperClassName?: string;` to the interface:

```tsx
interface FieldProps {
  // ... existing props
  wrapperClassName?: string;
}
```

### 2. Props Update

Add default wrapper class:

```tsx
export function Field({
  // ... existing props
  wrapperClassName = 'form-field',
  // ... rest
}: FieldProps) {
```

### 3. JSX Structure Update

Remove all Tailwind classes and use semantic class names:

```tsx
return (
  <div className={wrapperClassName}>
    {label && (
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required-indicator">*</span>}
        {helperText && <Tooltip content={helperText} position="top" />}
      </label>
    )}

    <input
      id={fieldId}
      className={`${fieldError ? 'error' : ''} ${className || ''}`}
      aria-invalid={fieldError ? 'true' : 'false'}
      aria-describedby={fieldError ? `${fieldId}-error` : undefined}
      // ... other props
    />

    {fieldError && (
      <p id={`${fieldId}-error`} className="field-error">
        {fieldError}
      </p>
    )}
  </div>
);
```

## Benefits

1. **Clean Components** - No inline Tailwind classes
2. **Customizable** - Developers can override styles via `wrapperClassName`
3. **Consistent** - All styling controlled by CSS
4. **Maintainable** - Change styles in one place
5. **Backward Compatible** - Default styling preserved
6. **Accessible** - Uses proper `aria-invalid` for screen readers, `.error` class for styling

## Error Styling Approach

We use **both** `aria-invalid` attribute **and** `.error` class:

- `aria-invalid="true"` - For screen readers and accessibility tools
- `.error` class - For visual styling (more reliable than styling `aria-invalid`)

**Why not style `aria-invalid` directly?**
Browsers can set `aria-invalid="true"` for grammar/spelling checks or other validations, which would incorrectly trigger our error styles. The `.error` class gives us full control.

```tsx
<input
  aria-invalid={fieldError ? 'true' : 'false'} // ← For accessibility
  className={`${fieldError ? 'error' : ''}`} // ← For styling
/>
```

## Special Cases

### NumberField with Unit

Uses additional container class:

```tsx
{
  unit ? (
    <div className="number-field-container">
      <input
        className={`${fieldError ? 'error' : ''} ${unit ? 'has-unit' : ''}`}
      />
      <span className="number-unit">{unit}</span>
    </div>
  ) : (
    <input className={`${fieldError ? 'error' : ''}`} />
  );
}
```

### ColorField

Uses color field container:

```tsx
<div className="color-field-container">
  <input type="text" />
  <input type="color" />
</div>
```

### CheckboxField/RadioGroupField

Uses group containers:

```tsx
<div className="checkbox-group horizontal">
  <div className="checkbox-item">
    <input type="checkbox" />
    <label>{option.label}</label>
  </div>
</div>
```

## Component-Specific Classes

Some components use additional semantic classes for their specific needs:

### ColorField

- `.color-input-group` - Container for color picker and text input
- `.color-picker` - The color input element
- `.color-input` - The text input element

### RangeField

- `.range-value` - Displays current value next to label
- `.range-labels` - Container for min/max labels

### FileField

- `.file-size-hint` - Shows maximum file size
- `.file-list` - Container for selected files
- `.file-list-label` - Label for file list
- `.file-items` - List of selected files

### ReactSelectField

- `.react-select__*` - Standard react-select BEM classes
- Error state applied via parent `.error` class

All these classes are styled in `tailwind.scss` using semantic naming.

## Translation Usage

All validation error messages now use the translation function `_` from `lib/locale/translate/_.ts`:

```tsx
required: _('${field} is required', { field: label || name });
```

This ensures proper internationalization support.

## CSS Classes Used

- `.form-field` - Main wrapper
- `.required-indicator` - Required asterisk
- `.field-error` - Error messages
- `.field-helper` - Helper text
- `.number-field-container` - Number field with unit wrapper
- `.number-unit` - Unit display
- `.color-field-container` - Color field wrapper
- `.checkbox-group`, `.radio-group` - Group containers
- `.checkbox-item`, `.radio-item` - Individual items
- `.error` - Error state for inputs

## Migration Guide for Developers

### Before (Current Approach)

```tsx
<InputField name="email" label="Email" className="mb-6" />
```

### After (New Approach)

```tsx
// Use default styling
<InputField name="email" label="Email" />

// Or customize wrapper
<InputField
  name="email"
  label="Email"
  wrapperClassName="custom-field-wrapper mb-6"
/>
```

### Custom Styling Example

```css
.custom-field-wrapper {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.custom-field-wrapper label {
  color: #1f2937;
  font-weight: 600;
}

.custom-field-wrapper input {
  background-color: #f9fafb;
  border: 2px solid #d1d5db;
}

.custom-field-wrapper input.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}
```

## 🔧 TypeScript Fixes

### useFieldArray with react-hook-form

When using `useFieldArray` from react-hook-form, avoid over-specifying generic types which can cause typing conflicts:

**❌ Problematic approach:**

```tsx
const { fields, append, remove, replace } = useFieldArray<{
  option_text: string;
  option_id: string;
  uuid: string;
}>({
  name: 'options',
  control: control
});
```

**✅ Recommended approach:**

```tsx
const { fields, append, remove, replace } = useFieldArray({
  name: 'options',
  control
});
```

When accessing field data, remember that `fields` from `useFieldArray` only contain an `id` property by default. The actual field values should be managed through the form's field registration:

```tsx
// Don't destructure field properties directly from the field object
fields.map((field, index) => {
  // Use field.id for the key
  return (
    <div key={field.id}>
      <InputField name={`options.${index}.option_text`} />
    </div>
  );
});
```

This approach ensures TypeScript compatibility and proper integration with react-hook-form's validation and state management.

## 🧹 Field Cleanup & Conditional Rendering

### Automatic Field Unregistration

All field components now automatically unregister themselves from React Hook Form when they are unmounted. This is crucial for conditionally rendered fields to prevent sending stale or invalid data to the server.

**Implementation:**

```tsx
// Cleanup: unregister field when component unmounts
React.useEffect(() => {
  return () => {
    unregister(name);
  };
}, [name, unregister]);
```

**Why this matters:**

- Prevents stale field values from being submitted when fields are conditionally hidden
- Ensures form validation only applies to currently visible fields
- Maintains clean form state when fields are dynamically shown/hidden

**Components Updated:**

- ✅ InputField, NumberField, EmailField, PasswordField, TextareaField
- ✅ SelectField, CheckboxField, RadioGroupField
- ✅ UrlField, TelField, DateField, TimeField, DateTimeLocalField
- ✅ ColorField, FileField, RangeField
- ℹ️ ReactSelectField (uses Controller - automatic cleanup)

**Usage Example:**

```tsx
// Field will be automatically unregistered when condition changes
{
  showOptionalField && (
    <InputField name="optionalField" label="Optional Field" />
  );
}
```

## 🔧 Date/Time Field Default Value Fix

### Issue Fixed

Date, Time, and DateTime fields were not displaying default values properly. When `defaultValue="2025-07-30"` was provided, the field would show placeholder text instead of the actual value.

### Root Cause

The `defaultValue` prop was being passed to the component but not applied to the HTML input element. React Hook Form's `register()` function wasn't receiving the default value.

### Solution

Added `defaultValue={defaultValue}` to the input elements in:

- ✅ DateField
- ✅ TimeField
- ✅ DateTimeLocalField

**Before:**

```tsx
<input
  type="date"
  {...register(name, validationRules)}
  // Missing defaultValue
/>
```

**After:**

```tsx
<input
  type="date"
  defaultValue={defaultValue}
  {...register(name, validationRules)}
/>
```

### Usage Examples

```tsx
// Now works correctly
<DateField
  name="startDate"
  label="Start Date"
  defaultValue="2025-07-30"  // ✅ Will display in field
/>

<TimeField
  name="startTime"
  label="Start Time"
  defaultValue="14:30"  // ✅ Will display 2:30 PM
/>

<DateTimeLocalField
  name="eventDateTime"
  label="Event Date & Time"
  defaultValue="2025-07-30T14:30"  // ✅ Will display both
/>
```

### Date Format Requirements

- **DateField**: Use ISO date format `YYYY-MM-DD`
- **TimeField**: Use 24-hour format `HH:MM` or `HH:MM:SS`
- **DateTimeLocalField**: Use ISO datetime format `YYYY-MM-DDTHH:MM`

## 🆕 ReactSelectCreatableField Component

### New Creatable Select Component

Added `ReactSelectCreatableField` component for creating new options on the fly using react-select/creatable.

**Features:**

- All features of ReactSelectField
- Allow users to create new options by typing
- Customizable create option format
- Optional onCreateOption callback
- Automatic field cleanup on unmount

**Usage Examples:**

```tsx
// Basic creatable select
<ReactSelectCreatableField
  name="tags"
  label="Tags"
  options={existingTags}
  isMulti
  placeholder="Select or create tags..."
/>

// With custom create format
<ReactSelectCreatableField
  name="category"
  label="Category"
  options={categories}
  formatCreateLabel={(inputValue) => `Add new category: ${inputValue}`}
  onCreateOption={(inputValue) => {
    console.log('New category created:', inputValue);
    // Optionally save to backend
  }}
/>

// Single select with creation
<ReactSelectCreatableField
  name="status"
  label="Status"
  options={statusOptions}
  defaultValue="active"
  helperText="Select existing status or create a new one"
/>
```

**Props:**

- All ReactSelectField props
- `onCreateOption?: (inputValue: string) => void` - Callback when new option is created
- `formatCreateLabel?: (inputValue: string) => string` - Custom format for "Create X" label

**Default Behavior:**

- Creates option with `value` as lowercase, sanitized version of input
- Creates option with `label` as the original input text
- Automatically adds to field value when created

## 🆕 ToggleField Component

### New Toggle Switch Component

Added `ToggleField` component for boolean/binary choices with a modern toggle switch UI. Works like a radio button but specifically designed for on/off, yes/no, enabled/disabled type fields.

**Features:**

- Boolean (true/false) or numeric (1/0) values
- Customizable labels for true/false states
- Multiple sizes (sm, md, lg)
- Multiple variants (default, success, warning, danger)
- Fully accessible with ARIA attributes
- Keyboard navigation support
- Error state styling
- Automatic field cleanup on unmount

**Usage Examples:**

```tsx
// Basic boolean toggle
<ToggleField
  name="isActive"
  label="Active Status"
  defaultValue={true}
/>

// Custom labels
<ToggleField
  name="emailNotifications"
  label="Email Notifications"
  trueLabel="Enabled"
  falseLabel="Disabled"
  defaultValue={false}
/>

// Numeric values (1/0)
<ToggleField
  name="status"
  label="Status"
  trueValue={1}
  falseValue={0}
  trueLabel="On"
  falseLabel="Off"
  defaultValue={0}
/>

// Different sizes and variants
<ToggleField
  name="criticalAlert"
  label="Critical Alerts"
  size="lg"
  variant="danger"
  trueLabel="Enabled"
  falseLabel="Disabled"
  required
/>

// With validation
<ToggleField
  name="acceptTerms"
  label="Accept Terms & Conditions"
  trueLabel="I Accept"
  falseLabel="Not Accepted"
  required
  validation={{
    validate: (value) => value === true || "You must accept the terms"
  }}
/>
```

**Props:**

- `trueValue?` - Value when toggle is on (default: `true`)
- `falseValue?` - Value when toggle is off (default: `false`)
- `trueLabel?` - Label for true state (default: "Yes")
- `falseLabel?` - Label for false state (default: "No")
- `size?` - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
- `variant?` - Color variant: 'default' | 'success' | 'warning' | 'danger'
- `defaultValue?` - Initial value (boolean | 0 | 1)

**Accessibility:**

- Uses `role="switch"` for screen readers
- `aria-checked` reflects current state
- `aria-labelledby` connects to label
- Keyboard accessible (Space/Enter to toggle)
- Focus indicators and screen reader text

**Visual States:**

- **Inactive**: Gray background with white thumb on left
- **Active**: Colored background (based on variant) with white thumb on right
- **Error**: Red ring around toggle
- **Disabled**: Reduced opacity and disabled cursor
