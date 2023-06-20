const { insert, select } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const data = request.body;
  const parentId = data.parent_id;

  if (parentId) {
    // Load the parent category
    const parentCategory = await select()
      .from('category')
      .where('category_id', '=', parentId)
      .load(connection);

    if (!parentCategory) {
      throw new Error('Parent category not found');
    }
  }

  const result = await insert('category').given(data).execute(connection);
  await insert('category_description')
    .given(data)
    .prime('category_description_category_id', result.insertId)
    .execute(connection);

  return result;
};
