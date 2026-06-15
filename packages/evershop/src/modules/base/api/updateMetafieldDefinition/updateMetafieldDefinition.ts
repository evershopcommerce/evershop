import { updateMetafieldDefinition } from '../../../../lib/metafield/index.js';
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
    // fieldKey/fieldType/isList/ownerType/namespace are immutable — passing them
    // unchanged is a no-op; changing them is rejected by the service with a 400.
    const definition = await updateMetafieldDefinition(request.params.uuid as string, {
      ownerType: b.ownerType,
      namespace: b.namespace,
      key: b.fieldKey,
      type: b.fieldType,
      isList: b.isList,
      name: b.name,
      description: b.description,
      required: b.required,
      translatable: b.translatable,
      visibleToCustomer: b.visibleToCustomer,
      referenceType: b.referenceType,
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
