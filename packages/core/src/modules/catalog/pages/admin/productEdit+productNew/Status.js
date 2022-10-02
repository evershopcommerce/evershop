import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';
import Select from 'react-select';
import { useQuery } from 'urql';

const categoryQuery = `
  query Query {
    categories {
      items {
        value: categoryId,
        label: name
      }
    }
  }
`;

export function Category({
  product
}) {
  const categories = product ? product.categories : [];
  const [result, reexecuteQuery] = useQuery({
    query: categoryQuery,
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div>
      <div className='mb-1'>Category</div>
      <Select
        name='categories'
        options={data.categories.items}
        hideSelectedOptions={true}
        isMulti={true}
        defaultValue={categories}
      />
    </div>
  );
}

export default function Status({ product }) {
  return (
    <Card
      title="Product status"
      subdued
    >
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product?.status}
          label="Status"
          options={[{ value: 0, text: 'Disabled' }, { value: 1, text: 'Enabled' }]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="visibility"
          name="visibility"
          value={product?.visibility}
          label="Visibility"
          options={[{ value: 0, text: 'Not visible' }, { value: 1, text: 'Visible' }]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Category product={product} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      status
      visibility
      categories {
        value: categoryId
        label: name
      }
    }
  }
`;