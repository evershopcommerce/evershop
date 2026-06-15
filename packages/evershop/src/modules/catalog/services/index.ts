// Products
export { default as createProduct } from './product/createProduct.js';
export * from './product/createProduct.js';
export { default as updateProduct } from './product/updateProduct.js';
export * from './product/updateProduct.js';
export { default as deleteProduct } from './product/deleteProduct.js';
export * from './product/deleteProduct.js';
export * from './product/productMetafield.js';

// Categories
export { default as createCategory } from './category/createCategory.js';
export * from './category/createCategory.js';
export { default as updateCategory } from './category/updateCategory.js';
export * from './category/updateCategory.js';
export { default as deleteCategory } from './category/deleteCategory.js';
export * from './category/deleteCategory.js';
export * from './category/categoryMetafield.js';

// Collections
export { default as createCollection } from './collection/createCollection.js';
export * from './collection/createCollection.js';
export { default as updateCollection } from './collection/updateCollection.js';
export * from './collection/updateCollection.js';
export { default as deleteCollection } from './collection/deleteCollection.js';
export * from './collection/deleteCollection.js';
export * from './collection/collectionMetafield.js';

// Attributes
// AttributeData is exported from createProductAttribute only to avoid name conflict
export { default as createAttribute } from './attribute/createProductAttribute.js';
export * from './attribute/createProductAttribute.js';
export { default as updateAttribute } from './attribute/updateProductAttribute.js';
export {
  hookBeforeUpdateAttributeData,
  hookAfterUpdateAttributeData,
  hookBeforeUpdateAttributeGroups,
  hookAfterUpdateAttributeGroups,
  hookBeforeUpdateAttributeOptions,
  hookAfterUpdateAttributeOptions,
  hookBeforeUpdateAttribute,
  hookAfterUpdateAttribute
} from './attribute/updateProductAttribute.js';
export { default as deleteAttribute } from './attribute/deleteProductAttribute.js';
export * from './attribute/deleteProductAttribute.js';

// Query helpers
export * from './getCategoriesBaseQuery.js';
export * from './getCollectionsBaseQuery.js';
export * from './getProductsBaseQuery.js';
export * from './getProductsByCategoryBaseQuery.js';
export * from './getProductsByCollectionBaseQuery.js';
