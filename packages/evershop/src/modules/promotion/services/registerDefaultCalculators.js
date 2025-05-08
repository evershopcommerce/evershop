import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { toPrice } from '../../checkout/services/toPrice.js';

export function registerDefaultCalculators() {
  return [
    async function percentageDiscountToEntireOrderCalculator(cart, coupon) {
      const priceIncludingTax = getConfig(
        'pricing.tax.price_including_tax',
        false
      );
      if (coupon.discount_type !== 'percentage_discount_to_entire_order') {
        return false;
      }
      const discountPercent = parseInt(coupon.discount_amount, 10);
      if (discountPercent <= 0 || discountPercent > 100) {
        return false;
      }

      const cartSubTotal = priceIncludingTax
        ? cart.getData('sub_total_incl_tax')
        : cart.getData('sub_total');
      const cartDiscountAmount = toPrice(
        (discountPercent * cartSubTotal) / 100
      );
      let distributedAmount = 0;
      const discounts = {};
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (index === items.length - 1) {
          const precision = getConfig('pricing.precision', '2');
          const precisionFix = 10 ** precision;
          sharedDiscount =
            (cartDiscountAmount * precisionFix -
              distributedAmount * precisionFix) /
            precisionFix;
          // Fix for rounding error
          sharedDiscount = parseFloat(sharedDiscount.toFixed(precision));
        } else {
          const lineTotal = priceIncludingTax
            ? item.getData('line_total_incl_tax')
            : item.getData('line_total');
          sharedDiscount = toPrice(
            (lineTotal * cartDiscountAmount) / cartSubTotal,
            0
          );
        }
        if (
          discounts[item.getId()] ||
          discounts[item.getId()] !== sharedDiscount
        ) {
          discounts[item.getId()] = sharedDiscount;
        }
        distributedAmount += sharedDiscount;
      });
      await Promise.all(
        items.map(async (item) => {
          await item.setData('discount_amount', discounts[item.getId()] || 0);
        })
      );

      return true;
    },
    async function fixedDiscountToEntireOrderCalculator(cart, coupon) {
      const priceIncludingTax = getConfig(
        'pricing.tax.price_including_tax',
        false
      );
      if (coupon.discount_type !== 'fixed_discount_to_entire_order')
        return false;

      let cartDiscountAmount = toPrice(parseFloat(coupon.discount_amount) || 0);
      if (cartDiscountAmount < 0) {
        return false;
      }
      const cartSubTotal = priceIncludingTax
        ? cart.getData('sub_total_incl_tax')
        : cart.getData('sub_total');
      cartDiscountAmount =
        cartSubTotal > cartDiscountAmount ? cartDiscountAmount : cartSubTotal;
      let distributedAmount = 0;
      const discounts = {};
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (index === items.length - 1) {
          const precision = getConfig('pricing.precision', '2');
          const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);
          sharedDiscount =
            (cartDiscountAmount * precisionFix -
              distributedAmount * precisionFix) /
            precisionFix;
          // Fix for rounding error
          sharedDiscount = parseFloat(sharedDiscount.toFixed(precision));
        } else {
          const lineTotal = priceIncludingTax
            ? item.getData('line_total_incl_tax')
            : item.getData('line_total');
          sharedDiscount = toPrice(
            (lineTotal * cartDiscountAmount) / cartSubTotal,
            0
          );
        }
        if (
          !discounts[item.getId()] ||
          discounts[item.getId()] !== sharedDiscount
        ) {
          discounts[item.getId()] = sharedDiscount;
        }
        distributedAmount += sharedDiscount;
      });
      await Promise.all(
        items.map(async (item) => {
          await item.setData('discount_amount', discounts[item.getId()] || 0);
        })
      );
      return true;
    },
    async function discountToSpecificProductsCalculator(cart, coupon) {
      const priceIncludingTax = getConfig(
        'pricing.tax.price_including_tax',
        false
      );
      if (
        ![
          'fixed_discount_to_specific_products',
          'percentage_discount_to_specific_products'
        ].includes(coupon.discount_type)
      ) {
        return false;
      }
      const targetConfig = coupon.target_products;

      const maxQty = parseInt(targetConfig.maxQty, 10) || 0;
      if (maxQty <= 0) {
        return false;
      }
      const targetProducts = targetConfig.products || [];
      let discountAmount = toPrice(parseFloat(coupon.discount_amount) || 0);
      const discounts = {};
      const items = cart.getItems();
      // Get collections of all products
      const collections = await select()
        .from('product_collection')
        .where(
          'product_id',
          'IN',
          items.map((item) => item.getData('product_id'))
        )
        .execute(pool);

      items.forEach((item) => {
        // Check if the item is in the target products
        let flag = true;
        targetProducts.forEach((targetProduct) => {
          if (flag === false) {
            return;
          }
          const { key } = targetProduct;
          let { operator } = targetProduct;
          const { value } = targetProduct;
          // Check attribute group based items
          if (key === 'attribute_group') {
            // If key is attribute group, we only support IN and NOT IN operator
            if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
              flag = false;
              return false;
            }
            const attributeGroupIds = value.map((id) =>
              parseInt(id.trim(), 10)
            );
            flag =
              operator === 'IN'
                ? attributeGroupIds.includes(item.getData('group_id'))
                : !attributeGroupIds.includes(item.getData('group_id'));
          }

          // Check category based items
          if (key === 'category') {
            const productCategoryId = item.getData('category_id');
            // If key is category, we only support IN and NOT IN operator
            if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
              flag = false;
              return false;
            }

            const requiredCategoryIds = value.map((id) =>
              parseInt(id.trim(), 10)
            );
            if (operator === 'IN') {
              flag = requiredCategoryIds.includes(productCategoryId);
            } else {
              flag = !requiredCategoryIds.includes(productCategoryId);
            }
          }
          // Check collection based items
          if (key === 'collection') {
            // If key is category, we only support IN and NOT IN operator
            if (!['IN', 'NOT IN'].includes(operator) || !Array.isArray(value)) {
              flag = false;
              return false;
            }

            const requiredCollectionIDs = value.map((id) =>
              parseInt(id.trim(), 10)
            );
            if (operator === 'IN') {
              flag = collections.some(
                (collection) =>
                  requiredCollectionIDs.includes(collection.collection_id) &&
                  collection.product_id === item.getData('product_id')
              );
            } else {
              flag = !collections.some(
                (collection) =>
                  requiredCollectionIDs.includes(collection.collection_id) &&
                  collection.product_id === item.getData('product_id')
              );
            }
          }
          // Check price based items
          if (key === 'price') {
            // If key is price, we do not support IN and NOT IN operator
            if (['=', '!=', '>', '>=', '<', '<='].includes(operator)) {
              const price = parseFloat(value);
              if (operator === '=') {
                operator = '===';
              }
              if (!price) {
                flag = false;
                return false;
              } else {
                flag = eval(
                  `${item.getData('final_price')} ${operator} ${price}`
                );
              }
            } else {
              // For 'price' type of condition, we do not others operators
              flag = false;
              return false;
            }
          }

          // Check sku based items
          if (key === 'sku') {
            if (['IN', 'NOT IN'].includes(operator) && Array.isArray(value)) {
              const skus = value.map((v) => v.trim());
              flag =
                operator === 'IN'
                  ? skus.includes(item.getData('product_sku'))
                  : !skus.includes(item.getData('product_sku'));
            } else {
              // For 'sku' type of condition, we only support 'IN', 'NOT IN' operators
              flag = false;
              return false;
            }
          }
        });

        // If cart item does not match the target products, we do not apply the discount
        if (flag === false) {
          return;
        }
        if (coupon.discount_type === 'fixed_discount_to_specific_products') {
          discountAmount = Math.min(
            discountAmount,
            priceIncludingTax
              ? item.getData('final_price_incl_tax')
              : item.getData('final_price')
          );
          discounts[item.getId()] =
            Math.min(item.getData('qty'), maxQty) * discountAmount;
        } else {
          const discountPercent = Math.min(discountAmount, 100);
          discounts[item.getId()] = toPrice(
            ((discountPercent *
              (priceIncludingTax
                ? item.getData('final_price_incl_tax')
                : item.getData('final_price'))) /
              100) *
              Math.min(item.getData('qty'), maxQty)
          );
        }
      });

      await Promise.all(
        items.map(async (item) => {
          await item.setData('discount_amount', discounts[item.getId()] || 0);
        })
      );
      return true;
    },
    async function buyXGetYCalculator(cart, coupon) {
      const priceIncludingTax = getConfig(
        'pricing.tax.price_including_tax',
        false
      );
      if (coupon.discount_type !== 'buy_x_get_y') {
        return true;
      }
      const configs = coupon.buyx_gety;
      const items = cart.getItems();
      const discounts = {};
      configs.forEach((row) => {
        const sku = row.sku ?? null;
        const buyQty = parseInt(row.buy_qty, 10) || null;
        const getQty = parseInt(row.get_qty, 10) || null;
        const maxY = row.max_y.trim()
          ? Math.max(parseInt(row.max_y, 10), 0)
          : 10000000;
        const discount = row.discount ? parseFloat(row.discount) || 0 : 100;
        if (!sku || !buyQty || !getQty || discount <= 0 || discount > 100) {
          return;
        }

        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (
            item.getData('product_sku') === sku.trim() &&
            item.getData('qty') >= buyQty + getQty
          ) {
            const discountPerUnit = toPrice(
              (discount *
                (priceIncludingTax
                  ? item.getData('final_price_incl_tax')
                  : item.getData('final_price'))) /
                100
            );
            const discountAbleUnits =
              Math.floor(item.getData('qty') / buyQty) * getQty;
            let discountAmount;
            if (discountAbleUnits < maxY) {
              discountAmount = toPrice(discountAbleUnits * discountPerUnit);
            } else {
              discountAmount = toPrice(discountPerUnit * maxY);
            }

            if (
              discounts[item.getId()] ||
              discounts[item.getId()] !== discountAmount
            ) {
              discounts[item.getId()] = discountAmount;
            }
          }
        }
      });

      await Promise.all(
        items.map(async (item) => {
          await item.setData('discount_amount', discounts[item.getId()] || 0);
        })
      );
    }
  ];
}
