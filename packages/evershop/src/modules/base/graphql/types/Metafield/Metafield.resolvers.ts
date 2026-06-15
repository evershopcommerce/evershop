import { GraphQLJSON } from 'graphql-type-json';

// Map GraphQL enum values to the internal (DB) field_type strings, so resolvers
// can return rows verbatim (e.g. { type: 'short_text' } -> SHORT_TEXT).
export default {
  JSON: GraphQLJSON,
  MetafieldType: {
    SHORT_TEXT: 'short_text',
    LONG_TEXT: 'long_text',
    RICH_TEXT: 'rich_text',
    INTEGER: 'integer',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    DATE: 'date',
    COLOR: 'color',
    URL: 'url',
    MONEY: 'money',
    JSON: 'json',
    REFERENCE: 'reference',
    GROUP: 'group'
  }
};
