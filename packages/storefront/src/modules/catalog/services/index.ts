import createAttribute from './attribute/createProductAttribute.js';
import deleteAttribute from './attribute/deleteProductAttribute.js';
import updateAttribute from './attribute/updateProductAttribute.js';
import createCategory from './category/createCategory.js';
import deleteCategory from './category/deleteCategory.js';
import updateCategory from './category/updateCategory.js';
import createCollection from './collection/createCollection.js';
import deleteCollection from './collection/deleteCollection.js';
import updateCollection from './collection/updateCollection.js';
import { getCategoriesBaseQuery } from './getCategoriesBaseQuery.js';
import { getCollectionsBaseQuery } from './getCollectionsBaseQuery.js';
import { getProductsBaseQuery } from './getProductsBaseQuery.js';
import { getProductsByCategoryBaseQuery } from './getProductsByCategoryBaseQuery.js';
import { getProductsByCollectionBaseQuery } from './getProductsByCollectionBaseQuery.js';
import createProduct from './product/createProduct.js';
import deleteProduct from './product/deleteProduct.js';
import updateProduct from './product/updateProduct.js';

export {
  createProduct,
  updateProduct,
  deleteProduct,
  createCollection,
  updateCollection,
  deleteCollection,
  createCategory,
  updateCategory,
  deleteCategory,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getCategoriesBaseQuery,
  getCollectionsBaseQuery,
  getProductsBaseQuery,
  getProductsByCategoryBaseQuery,
  getProductsByCollectionBaseQuery
};
