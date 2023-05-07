/* eslint-disable camelcase */
const { insert, select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { attribute_codes, attribute_group_id } = request.body;
  try {
    if (attribute_codes.length === 0) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'No attributes provided'
        }
      });
      return;
    }

    if (attribute_codes.length > 5) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'We only support up to 5 attributes'
        }
      });
      return;
    }

    const attributes = await select()
      .from('attribute')
      .where('attribute_code', 'in', attribute_codes)
      .and('type', '=', 'select')
      .execute(pool);

    if (attributes.length !== attribute_codes.length) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute must be of type select'
        }
      });
      return;
    }

    const attributeGroupLinks = await select()
      .from('attribute_group_link')
      .where('group_id', '=', attribute_group_id)
      .and(
        'attribute_id',
        'in',
        attributes.map((a) => a.attribute_id)
      )
      .execute(pool);

    if (attributeGroupLinks.length !== attributes.length) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute must be assigned to the group'
        }
      });
      return;
    }

    const data = {};
    attributes.forEach((attribute, index) => {
      let column;
      switch (index) {
        case 0:
          column = 'attribute_one';
          break;
        case 1:
          column = 'attribute_two';
          break;
        case 2:
          column = 'attribute_three';
          break;
        case 3:
          column = 'attribute_four';
          break;
        case 4:
          column = 'attribute_five';
          break;
        default:
          break;
      }
      data[column] = attribute.attribute_id;
    });
    data.attribute_group_id = attribute_group_id;
    // Create a variant group
    const result = await insert('variant_group').given(data).execute(pool);

    const group = await select()
      .from('variant_group')
      .where('variant_group_id', '=', result.insertId)
      .load(pool);

    const promises = attributes.map(async (attribute) => {
      const { attribute_id } = attribute;
      const options = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute_id)
        .execute(pool);
      return {
        ...attribute,
        options
      };
    });

    const results = await Promise.all(promises);

    group.attributes = results;
    group.addItemApi = buildUrl('addVariantItem', { id: group.uuid });

    response.status(OK);
    response.json({
      data: group
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
