import { merge } from '@evershop/evershop/src/lib/util/merge.js';
import { addProcessor } from '@evershop/evershop/src/lib/util/registry.js';

export default () => {
  addProcessor('configuratonSchema', (schema) => {
    merge(
      schema,
      {
        properties: {
          google_login: {
            type: 'object',
            properties: {
              client_id: {
                type: 'string'
              },
              client_secret: {
                type: 'string'
              },
              success_redirect_url: {
                type: 'string',
                format: 'uri'
              },
              failure_redirect_url: {
                type: 'string',
                format: 'uri'
              }
            }
          }
        }
      },
      100
    );
    return schema;
  });
};
