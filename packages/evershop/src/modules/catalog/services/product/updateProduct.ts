import {
  commit,
  del,
  insert,
  insertOnUpdate,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { sanitizeRawHtml } from '../../../../lib/util/sanitizeHtml.js';
import type { ProductDescriptionRow, ProductRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import type { ProductAttributeData, ProductData, ProductInventoryData } from './createProduct.js';
import productDataSchema from './productDataSchema.json' with { type: 'json' };

function validateProductDataBeforeUpdate(data: ProductData): ProductData {
  const ajv = getAjv();
  (productDataSchema as JSONSchemaType<any>).required = [];
  const jsonSchema = getValueSync(
    'updateProductDataJsonSchema',
    productDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateProductInventory(inventoryData: ProductInventoryData, productId: number, connection: PoolClient): Promise<void> {
  // Save the product inventory
  try {
    // Update product inventory
    await update('product_inventory')
      .given(inventoryData)
      .where('product_inventory_product_id', '=', productId)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
}

/**
 * @param {number} productId
 * @param {[{attribute_code: string, value}]} attributes
 * @param {*} connection
 * @returns
 */
async function saveProductAttributes(productId: number, attributes: ProductAttributeData[], connection: PoolClient): Promise<void> {
  for (let i = 0; i < attributes.length; i += 1) {
    const attribute = attributes[i];
    if (attribute.value) {
      const attr = await select()
        .from('attribute')
        .where('attribute_code', '=', attribute.attribute_code)
        .load(connection);

      if (!attr) {
        return;
      }

      if (attr.type === 'textarea' || attr.type === 'text') {
        // Thrown error if value is not a string
        if (typeof attribute.value !== 'string') {
          throw new Error(`Attribute value must be a string for attribute ${attribute.attribute_code}`);
        }
        const flag = await select('attribute_id')
          .from('product_attribute_value_index')
          .where('product_id', '=', productId)
          .and('attribute_id', '=', attr.attribute_id)
          .load(connection);

        if (flag) {
          await update('product_attribute_value_index')
            .given({ option_text: attribute.value.trim() })
            .where('product_id', '=', productId)
            .and('attribute_id', '=', attr.attribute_id)
            .execute(connection);
        } else {
          await insert('product_attribute_value_index')
            .prime('product_id', productId)
            .prime('attribute_id', attr.attribute_id)
            .prime('option_text', attribute.value.trim())
            .execute(connection);
        }
      } else if (attr.type === 'multiselect') {
        // Thrown error if value is not an array
        if (!Array.isArray(attribute.value)) {
          throw new Error(`Attribute value must be an array for attribute ${attribute.attribute_code}`);
        }
        await Promise.all(
          attribute.value.map((optionId) =>
            (async () => {
              const option = await select()
                .from('attribute_option')
                .where(
                  'attribute_option_id',
                  '=',
                  parseInt(optionId, 10)
                )
                .load(connection);
              if (option === null) {
                return;
              }
              await insertOnUpdate('product_attribute_value_index', [
                'product_id',
                'attribute_id',
                'option_id'
              ])
                .prime('option_id', option.attribute_option_id)
                .prime('product_id', productId)
                .prime('attribute_id', attr.attribute_id)
                .prime('option_text', option.option_text)
                .execute(connection);
            })()
          )
        );
        // Delete old options that are not in the new value
        await del('product_attribute_value_index')
          .where('attribute_id', '=', attr.attribute_id)
          .and('product_id', '=', productId)
          .and('option_id', 'NOT IN', attribute.value.map((v) => parseInt(v, 10)))
          .execute(connection);
      } else if (attr.type === 'select') {
        const option = await select()
          .from('attribute_option')
          .where('attribute_option_id', '=', parseInt(attribute.value, 10))
          .load(connection);
        if (option === false) {
           
          continue;
        }
        // Delete old option if any
        await del('product_attribute_value_index')
          .where('attribute_id', '=', attr.attribute_id)
          .and('product_id', '=', productId)
          .execute(connection);
        // Insert new option
        await insertOnUpdate('product_attribute_value_index', [
          'product_id',
          'attribute_id',
          'option_id'
        ])
          .prime('option_id', option.attribute_option_id)
          .prime('product_id', productId)
          .prime('attribute_id', attr.attribute_id)
          .prime('option_text', option.option_text)
          .execute(connection);
      } else {
        await insertOnUpdate('product_attribute_value_index', [
          'product_id',
          'attribute_id',
          'option_id'
        ])
          .prime('option_text', attribute.value)
          .execute(connection);
      }
    }
  }
}

async function updateProductAttributes(
  attributes: ProductAttributeData[],
  productId: number,
  variantGroupId: number | null,
  connection: PoolClient
): Promise<void> {
  if (!variantGroupId) {
    await saveProductAttributes(productId, attributes, connection);
  } else {
    const promises = [saveProductAttributes(productId, attributes, connection)];
    const variantGroup = await select(
      'attribute_one',
      'attribute_two',
      'attribute_three',
      'attribute_four',
      'attribute_five'
    )
      .from('variant_group')
      .where('variant_group_id', '=', variantGroupId)
      .load(connection);

    // Get all the variant attributes
    const variantAttributes = await select()
      .from('attribute')
      .where(
        'attribute_id',
        'IN',
        Object.values(variantGroup).filter((v) => v !== null)
      )
      .execute(connection);

    // Remove the attributes that are variant attributes
    const filteredAttributes = attributes.filter((attr) =>
      variantAttributes.every((v) => v.attribute_code !== attr.attribute_code)
    );

    const variants = await select()
      .from('product')
      .where('variant_group_id', '=', variantGroupId)
      .and('product_id', '!=', productId)
      .execute(connection);

    for (let i = 0; i < variants.length; i += 1) {
      promises.push(
        saveProductAttributes(
          variants[i].product_id,
          filteredAttributes,
          connection
        )
      );
    }
    await Promise.all(promises);
  }
}

async function updateProductImages(images: string[] | undefined, productId: number, connection: PoolClient): Promise<void> {
  if (Array.isArray(images) && images.length === 0) {
    // Delete all images
    await del('product_image')
      .where('product_image_product_id', '=', productId)
      .execute(connection);
  }
  if (Array.isArray(images) && images.length > 0) {
    const baseUrl = getBaseUrl();
    try {
      // Delete all images that not in the gallery anymore
      await del('product_image')
        .where('product_image_product_id', '=', productId)
        .and('origin_image', 'NOT IN', images)
        .execute(connection);

      await Promise.all(
        images.map((f, index) =>
          (async () => {
        // Remove baseUrl from the image path if it exists
        const imagePath = f.startsWith(baseUrl) ? f.substring(baseUrl.length) : f;
        
        const image = await select()
          .from('product_image')
          .where('product_image_product_id', '=', productId)
          .and('origin_image', '=', imagePath)
          .load(connection);

        if (!image) {
          await insert('product_image')
            .given({
          product_image_product_id: productId,
          origin_image: imagePath,
          is_main: index === 0
            })
            .execute(connection);
        } else {
          await update('product_image')
            .given({ is_main: index === 0 })
            .where('product_image_product_id', '=', productId)
            .and('origin_image', '=', imagePath)
            .execute(connection);
        }
          })()
        )
      );
    } catch (e) {
      error(e);
      throw e;
    }
  }
}

async function updateProductData(uuid: string, data: ProductData, connection: PoolClient): Promise<ProductRow & ProductDescriptionRow & { updatedId?: number }> {
  // If no_shipping_required is true, set weight to 0 and drop the package —
  // virtual products have no parcel. (Only force package_id when the payload
  // actually flips the product to virtual; a partial update without
  // no_shipping_required must not null an existing package.)
  const productData = {
    ...data,
    weight: data.no_shipping_required ? 0 : data.weight,
    ...(data.no_shipping_required ? { package_id: null } : {})
  };
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  const product = await query.where('uuid', '=', uuid).load(connection);
  if (!product) {
    throw new Error('Requested product not found');
  }

  let newProduct;
  try {
    newProduct = await update('product')
      .given(productData)
      .where('uuid', '=', uuid)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  let description;
  try {
    description = await update('product_description')
      .given(data)
      .where('product_description_product_id', '=', product.product_id)
      .execute(connection);
    Object.assign(product, description);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  // A package (parcel size) is mandatory for SHIPPABLE products — checked on
  // the FINAL state (post-update row), so legacy products (package_id NULL
  // from before the feature) must pick a package on their next edit, and a
  // product flipped from virtual to shippable must pick one in the same save.
  // The whole update runs in a transaction, so throwing here rolls back.
  // See wiki/package-management-design.md.
  const effectiveProduct = newProduct ?? product;
  if (
    !effectiveProduct.no_shipping_required &&
    effectiveProduct.package_id === null
  ) {
    throw new Error('A package is required for shippable products');
  }

  // Update product category and tax class to all products in same variant group
  if (product.variant_group_id) {
    const sharedData: Record<string, any> = {};
    if (newProduct.tax_class !== product.tax_class) {
      sharedData.tax_class = newProduct.tax_class;
    }
    if (newProduct.category_id !== product.category_id) {
      sharedData.category_id = newProduct.category_id;
    }
    if (newProduct.no_shipping_required !== product.no_shipping_required) {
      sharedData.no_shipping_required = newProduct.no_shipping_required;
      sharedData.weight = newProduct.weight;
    }
    // Variants are SIBLINGS (no parent/child) and a variant group ships in
    // one box — all members share one package_id. Whichever member is saved
    // propagates its package to the whole group (same transaction), so two
    // members can never durably disagree. Editing any one member also
    // un-legacies the entire group.
    //
    // Propagate on EVERY save, not only when the saved member's package
    // changed — siblings can drift (a product that joined the group with no
    // package, a legacy member), and re-saving any member must repair the
    // group. Never push NULL (only virtual members can hold it after
    // validation) over siblings.
    if (newProduct.package_id !== null && newProduct.package_id !== undefined) {
      sharedData.package_id = newProduct.package_id;
    }
    const sharedVariantData = getValueSync<Record<string, any>>(
      'sharedVariantProductDataOnUpdate',
      sharedData,
      {newProduct, product}
    );
    if (Object.keys(sharedVariantData).length > 0) {
      await update('product')
        .given(sharedVariantData)
        .where('variant_group_id', '=', product.variant_group_id)
        .and('product_id', '<>', product.product_id)
        .execute(connection);
    }
  }
  return {
    ...description,
    ...newProduct,
    updatedId: product.product_id
  }
}

/**
 * Update product service. This service will update a product with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateProduct(uuid: string, data: ProductData, context: Record<string, any>): Promise<ProductRow & ProductDescriptionRow & { updatedId?: number }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const currentProduct = await select()
      .from('product')
      .where('uuid', '=', uuid)
      .load(connection);

    if (!currentProduct) {
      throw new Error('Requested product does not exist');
    }

    const productData = await getValue('productDataBeforeUpdate', data);

    // Validate product data
    validateProductDataBeforeUpdate(productData);

    // Sanitize the description
    if (productData.description) {
      sanitizeRawHtml(productData.description);
    }
    // Insert product data
    const product = await hookable(updateProductData, {
      ...context,
      connection
    })(uuid, productData, connection);

    // Update product inventory
    await hookable(updateProductInventory, { ...context, connection, product })(
      productData,
      product.product_id,
      connection
    );

    // Update product attributes
    await hookable(updateProductAttributes, {
      ...context,
      connection,
      product
    })(
      productData.attributes || [],
      product.product_id,
      product.variant_group_id,
      connection
    );

    // Insert product images
    await hookable(updateProductImages, { ...context, connection, product })(
      productData.images,
      product.product_id,
      connection
    );

    await commit(connection);
    return product;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update product service. This service will update a product with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: ProductData, context: Record<string, any>): Promise<ProductRow & ProductDescriptionRow & { updatedId?: number }> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const product = await hookable(updateProduct, context)(uuid, data, context);
  return product;
};

export function hookBeforeUpdateProductData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: ProductData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateProductData', callback, priority);
}

export function hookAfterUpdateProductData(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: ProductData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateProductData', callback, priority);
}

export function hookBeforeUpdateProductInventory(
  callback: (
    this: Record<string, any>,
    ...args: [
    inventoryData: ProductInventoryData,
    productId: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateProductInventory', callback, priority);
}

export function hookAfterUpdateProductInventory(
  callback: (
    this: Record<string, any>,
    ...args: [
    inventoryData: ProductInventoryData,
    productId: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateProductInventory', callback, priority);
}

export function hookBeforeUpdateProductAttributes(
  callback: (
    this: Record<string, any>,
    ...args: [
    attributes: any[],
    productId: any,
    variantGroupId: any,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateProductAttributes', callback, priority);
}

export function hookAfterUpdateProductAttributes(
  callback: (
    this: Record<string, any>,
    ...args: [
    attributes: any[],
    productId: any,
    variantGroupId: any,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateProductAttributes', callback, priority);
}

export function hookBeforeUpdateProductImages(
  callback: (
    this: Record<string, any>,
    ...args: [
    images: any[],
    productId: any,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateProductImages', callback, priority);
}

export function hookAfterUpdateProductImages(
  callback: (
    this: Record<string, any>,
    ...args: [
    images: any[],
    productId: any,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateProductImages', callback, priority);
}

export function hookBeforeUpdateProduct(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: ProductData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateProduct', callback, priority);
}

export function hookAfterUpdateProduct(
  callback: (
    this: Record<string, any>,
    ...args: [
    uuid: string,
    data: ProductData,
    context: Record<string, any>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateProduct', callback, priority);
}
