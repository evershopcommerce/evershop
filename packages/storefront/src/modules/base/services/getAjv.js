import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';
import addFormats from 'ajv-formats';

export function getAjv() {
  // Initialize the ajv instance
  const ajv = new Ajv({
    strict: false,
    useDefaults: 'empty',
    allErrors: true
  });

  // Add the formats
  addFormats(ajv);
  ajv.addFormat('digit', /^[0-9]*$/);
  ajvErrors(ajv);

  return ajv;
}
