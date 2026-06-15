import { createMetafieldDefinition } from '../../../../lib/metafield/index.js';
import {
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const b = request.body;
    const definition = await createMetafieldDefinition({
      ownerType: b.ownerType,
      namespace: b.namespace,
      key: b.fieldKey,
      name: b.name,
      description: b.description,
      type: b.fieldType,
      referenceType: b.referenceType,
      isList: b.isList,
      required: b.required,
      translatable: b.translatable,
      visibleToCustomer: b.visibleToCustomer,
      validations: b.validations,
      appearance: b.appearance,
      subFields: b.subFields,
      position: b.position
    });
    response.status(OK);
    response.json({ data: definition });
  } catch (e) {
    const status = (e as any).status ?? INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message: (e as Error).message } });
  }
};
