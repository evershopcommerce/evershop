import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import Ckeditor from '../../../../../../lib/components/form/fields/Ckeditor';
import { Field } from '../../../../../../lib/components/form/Field';
import { Card } from '../../../../../cms/views/admin/Card';

function SKUPriceWeight({ sku, price, weight }) {
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
        />
      </div>
      <div>
        <Field
          id="price"
          name="price"
          value={price}
          placeholder="Price"
          label="Price"
          type="text"
        />
      </div>
      <div>
        <Field
          id="weight"
          name="weight"
          value={weight}
          placeholder="Weight"
          label="Weight"
          type="text"
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
  browserApi, deleteApi, uploadApi, folderCreateApi
}) {
  const context = useAppState();

  return (
    <Card
      title="General"
    >
      <Card.Session>
        <Area
          id="product-edit-general"
          coreComponents={[
            {
              component: { default: Field },
              props: {
                id: 'name',
                name: 'name',
                label: 'Name',
                value: get(context, 'product.name'),
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
                value: get(context, 'product.product_id'),
                type: 'hidden'
              },
              sortOrder: 10,
              id: 'product_id'
            },
            {
              component: { default: SKUPriceWeight },
              props: {
                sku: get(context, 'product.sku'),
                price: get(context, 'product.price'),
                weight: get(context, 'product.weight')
              },
              sortOrder: 20,
              id: 'SKUPriceWeight'
            },
            {
              component: { default: Ckeditor },
              props: {
                id: 'description',
                name: 'description',
                label: 'Description',
                value: get(context, 'product.description'),
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
