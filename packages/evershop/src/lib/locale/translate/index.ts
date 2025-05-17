export function _(text: string, values: Record<string, string>): string {
  // Check if the data is null, undefined or empty object
  if (!values || Object.keys(values).length === 0) {
    return text;
  }
  const template = `${text}`;
  return template.replace(/\${(.*?)}/g, (match, key) =>
    values[key.trim()] !== undefined ? values[key.trim()] : match
  );
}
