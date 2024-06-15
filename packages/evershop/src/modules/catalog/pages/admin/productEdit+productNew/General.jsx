import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';
import CkeditorField from '@components/common/form/fields/Ckeditor';
import CategoryTree from '@components/admin/catalog/productEdit/category/CategoryTree';

function SKUPriceWeight({ sku, price, weight, setting }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
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
  weight: PropTypes.number,
  setting: PropTypes.shape({
    storeCurrency: PropTypes.string,
    weightUnit: PropTypes.string
  }).isRequired
};

SKUPriceWeight.defaultProps = {
  price: undefined,
  sku: undefined,
  weight: undefined
};

function Category({ product }) {
  const [selecting, setSelecting] = React.useState(false);
  const [category, setCategory] = React.useState(
    product ? product.category : null
  );

  return (
    <div className="mt-6 relative">
      <div className="mb-4">Category</div>
      {category && (
        <div className="border rounded border-[#c9cccf] mb-4 p-4">
          {category.path.map((item, index) => (
            <span key={item.name} className="text-gray-500">
              {item.name}
              {index < category.path.length - 1 && ' > '}
            </span>
          ))}
          <span className="text-interactive pl-8">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSelecting(true);
              }}
            >
              Change
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCategory(null);
              }}
              className="text-critical ml-8"
            >
              Unassign
            </a>
          </span>
        </div>
      )}
      {!selecting && !category && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelecting(!selecting);
          }}
          className="text-interactive"
        >
          Select category
        </a>
      )}
      {selecting && (
        <CategoryTree
          selectedCategory={category}
          setSelectedCategory={(cat) => {
            setCategory(cat);
            setSelecting(false);
          }}
        />
      )}
      {category && (
        <input type="hidden" name="category_id" value={category?.categoryId} />
      )}
    </div>
  );
}

Category.propTypes = {
  product: PropTypes.shape({
    category: PropTypes.shape({
      categoryId: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      path: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired
        })
      ).isRequired
    })
  })
};

Category.defaultProps = {
  product: {
    category: {}
  }
};

export default function General({
  product,
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi,
  setting,
  productTaxClasses: { items: taxClasses }
}) {
  return (
    <Card title="General">
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
                setting
              },
              sortOrder: 20,
              id: 'SKUPriceWeight'
            },
            {
              component: { default: Category },
              props: {
                product
              },
              sortOrder: 22,
              id: 'category'
            },
            {
              component: { default: Field },
              props: {
                id: 'tax_class',
                name: 'tax_class',
                value: product?.taxClass || null,
                type: 'select',
                label: 'Tax class',
                options: [...taxClasses],
                placeholder: 'None',
                disableDefaultOption: false
              },
              sortOrder: 25,
              id: 'tax_class'
            },
            {
              component: { default: CkeditorField },
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
  uploadApi: PropTypes.string.isRequired,
  product: PropTypes.shape({
    description: PropTypes.string,
    name: PropTypes.string,
    price: PropTypes.shape({
      regular: PropTypes.shape({
        currency: PropTypes.string,
        value: PropTypes.number
      })
    }),
    productId: PropTypes.string,
    taxClass: PropTypes.number,
    sku: PropTypes.string,
    weight: PropTypes.shape({
      unit: PropTypes.string,
      value: PropTypes.number
    })
  }),
  setting: PropTypes.shape({
    storeCurrency: PropTypes.string,
    weightUnit: PropTypes.string
  }).isRequired,
  productTaxClasses: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      })
    )
  })
};

General.defaultProps = {
  product: undefined,
  productTaxClasses: {
    items: []
  }
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
      name
      description
      sku
      taxClass
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
      category {
        categoryId
        path {
          name
        }
      }
    }
    setting {
      weightUnit
      storeCurrency
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
    productTaxClasses: taxClasses {
      items {
        value: taxClassId
        text: name
      }
    }
  }
`;
