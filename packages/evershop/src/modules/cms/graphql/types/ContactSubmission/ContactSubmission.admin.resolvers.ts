import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { ContactSubmissionCollection } from '../../../services/contact/ContactSubmissionCollection.js';
import { getContactSubmissionsBaseQuery } from '../../../services/contact/getContactSubmissionsBaseQuery.js';

export default {
  Query: {
    contactSubmissions: async (_root: any, { filters = [] }: any) => {
      const query = getContactSubmissionsBaseQuery();
      const root = new ContactSubmissionCollection(query);
      await root.init(filters);
      return root;
    }
  },
  ContactSubmission: {
    // `DateTime` is an object type (value / timezone / text(format)) that
    // formats in the store timezone and language. Returning the raw column as a
    // `String` does NOT work: graphql-js serializes a JS Date through
    // `valueOf()`, so the client receives epoch milliseconds as a string and
    // `new Date(...)` on it yields "Invalid Date".
    createdAt: ({ createdAt }: any) => createdAt,
    customer: ({ customerUuid, customerFullName }: any) =>
      customerUuid ? { uuid: customerUuid, fullName: customerFullName } : null,
    updateApi: ({ uuid }: any) =>
      buildUrl('updateContactSubmission', { id: uuid }),
    deleteApi: ({ uuid }: any) =>
      buildUrl('deleteContactSubmission', { id: uuid })
  },
  ContactSubmissionCustomer: {
    editUrl: ({ uuid }: any) => buildUrl('customerEdit', { id: uuid })
  }
};
