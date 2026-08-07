/**
 * Helper function to get nested error from react-hook-form errors object
 * Handles both simple field names and nested array field names using dot notation (e.g., "attributes.0.value")
 * Also supports legacy bracket notation for backward compatibility
 */
export const getNestedError = (
  name: string,
  errors: any,
  error?: string
): string | undefined => {
  if (error) return error;

  if (!name.includes('.') && !name.includes('[')) {
    return errors[name]?.message;
  }

  let parts: string[];

  if (name.includes('[')) {
    parts = name.split(/[\[\]]+/).filter(Boolean);
  } else {
    parts = name.split('.');
  }

  let current = errors;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    const index = parseInt(part);
    if (!isNaN(index)) {
      current = current[index];
    } else {
      current = current[part];
    }
  }

  return current?.message;
};
