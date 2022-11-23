import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { TextArea } from '../../../../../lib/components/form/fields/Textarea';
import { Card } from '../../../../cms/components/admin/Card';

function SKUPriceWeight({ sku, price, weight, setting }) {
  return (
    <div className="grid grid-cols-3 gap-1 mt-15">
      <div>
        <Field
          id="sku"
          name="sku"
          value={sku}
          placeholder="SKU"
          label="SKU"
          type="text"
          validationRules={['notEmpty']}
        />
      </div>
      <div>
        <Field
          id="price"
          name="price"
          value={price?.value}
          placeholder="Price"
          label="Price"
          type="text"
          validationRules={['notEmpty']}
          suffix={setting.storeCurrency}
        />
      </div>
      <div>
        <Field
          id="weight"
          name="weight"
          value={weight?.value}
          placeholder="Weight"
          label="Weight"
          type="text"
          validationRules={['notEmpty']}
          suffix={setting.weightUnit}
        />
      </div>
    </div>
  );
}

SKUPriceWeight.propTypes = {
  price: PropTypes.number,
  sku: PropTypes.string,
  weight: PropTypes.number
};

SKUPriceWeight.defaultProps = {
  price: undefined,
  sku: undefined,
  weight: undefined
};

export default function General({
  product, browserApi, deleteApi, uploadApi, folderCreateApi, setting
}) {
  return (
    <Card
      title="General"
    >
      <Card.Session>
        <Area
          id="productEditGeneral"
          coreComponents={[
            {
              component: { default: Field },
              props: {
                id: 'name',
                name: 'name',
                label: 'Name',
                value: product?.name,
                validationRules: ['notEmpty'],
                type: 'text',
                placeholder: 'Name'
              },
              sortOrder: 10,
              id: 'name'
            },
            {
              component: { default: Field },
              props: {
                id: 'product_id',
                name: 'product_id',
                value: product?.productId,
                type: 'hidden'
              },
              sortOrder: 10,
              id: 'product_id'
            },
            {
              component: { default: SKUPriceWeight },
              props: {
                sku: product?.sku,
                price: product?.price.regular,
                weight: product?.weight,
                setting: setting
              },
              sortOrder: 20,
              id: 'SKUPriceWeight'
            },
            {
              component: { default: TextArea },
              props: {
                id: 'description',
                name: 'description',
                label: 'Description',
                value: product?.description,
                browserApi,
                deleteApi,
                uploadApi,
                folderCreateApi
              },
              sortOrder: 30,
              id: 'description'
            }
          ]}
        />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  browserApi: PropTypes.string.isRequired,
  deleteApi: PropTypes.string.isRequired,
  folderCreateApi: PropTypes.string.isRequired,
  uploadApi: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
      name
      description
      sku
      price {
        regular {
          value
          currency
        }
      }
      weight {
        value
        unit
      }
    }
    setting {
      weightUnit
      storeCurrency
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;