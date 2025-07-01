import {
  commit,
  insert,
  insertOnUpdate,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import productDataSchema from './productDataSchema.json'  with { type: 'json' };

export type ProductData = ProductInventoryData & {
  name: string,
  url_key?: string,
  status: string,
  sku: string,
  price: number,
  group_id: number,
  visibility?: string,
  attributes?: ProductAttributeData[],
  images?: string[],
  [key: string]: any
};

export type ProductInventoryData = {
  qty: number,
  manage_stock: boolean,
  stock_availability: boolean,
  [key: string]: any
}

export type ProductAttributeData = {
  attribute_code: string,
  value: string,
  [key: string]: any
}

function validateProductDataBeforeInsert(data: ProductData) {
  const ajv = getAjv();
  (productDataSchema as JSONSchemaType<any>).required = [
    'name',
    'url_key',
    'status',
    'sku',
    'qty',
    'price',
    'group_id',
    'visibility'
  ];
  const jsonSchema = getValueSync(
    'createProductDataJsonSchema',
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

async function insertProductInventory(inventoryData: ProductInventoryData, productId: number, connection: PoolClient) {
  // Save the product inventory
  await insert('product_inventory')
    .given(inventoryData)
    .prime('product_inventory_product_id', productId)
    .execute(connection);
}

async function insertProductAttributes(attributes: ProductAttributeData[], productId: number, connection: PoolClient) {
  // Looping attributes array
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
        // Throw error if attribute value is not a string
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
        // Throw error if attribute value is not an array
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
      } else if (attr.type === 'select') {
        const option = await select()
          .from('attribute_option')
          .where('attribute_option_id', '=', parseInt(attribute.value, 10))
          .load(connection);
         
        if (option === false) {
          continue;
        }
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

async function insertProductImages(images: string[], productId: number, connection: PoolClient) {
  await Promise.all(
    images.map((f, index) =>
      (async () => {
        await insert('product_image')
          .given({ origin_image: f, is_main: index === 0 })
          .prime('product_image_product_id', productId)
          .execute(connection);
      })()
    )
  );
}


async function insertProductData(data: ProductData, connection: PoolClient) {
  const product = await insert('product').given(data).execute(connection);
  const description = await insert('product_description')
    .given(data)
    .prime('product_description_product_id', product.product_id)
    .execute(connection);

  return {
    ...description,
    ...product
  };
}

/**
 * Create product service. This service will create a product with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createProduct(data: ProductData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const productData = await getValue('productDataBeforeCreate', data, {});

    // Validate product data
    validateProductDataBeforeInsert(productData);

    // Insert product data
    const product = await hookable(insertProductData, {
      connection,
      ...context
    })(productData, connection);

    // Insert product inventory
    await hookable(insertProductInventory, { ...context, connection, product })(
      productData,
      product.insertId,
      connection
    );
    // Insert product attributes
    await hookable(insertProductAttributes, {
      ...context,
      connection,
      product
    })(productData.attributes || [], product.insertId, connection);

    // Insert product images
    await hookable(insertProductImages, { ...context, connection, product })(
      productData.images || [],
      product.insertId,
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
 * Create product service. This service will create a product with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: ProductData, context: Record<string, any>) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const product = await hookable(createProduct, context)(data, context);
  return product;
};
