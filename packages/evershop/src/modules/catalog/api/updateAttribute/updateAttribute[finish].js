import updateProductAttribute from '../../services/attribute/updateProductAttribute.js';

export default async (request, response) => {
  const result = await updateProductAttribute(
    request.params.id,
    request.body,
    {}
  );
  return result;
};
