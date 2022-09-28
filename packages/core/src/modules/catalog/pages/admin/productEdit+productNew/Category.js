import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '../../../../cms/components/admin/Card';
import Select from 'react-select';
import { useQuery } from 'urql';

const categoryQuery = `
  query Query {
    categories {
      value: categoryId,
      label: name
    }
  }
`
export default function Category({
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
    <Card
      title="Category"
    >
      <Card.Session>
        <div className='mb-1'>Select categories the product belongs to</div>
        <Select
          name='categories'
          options={data.categories}
          hideSelectedOptions={true}
          isMulti={true}
          defaultValue={categories}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 30
}

export const query = `
  query Query {
    product(id: getContextValue("productId")) {
      categories {
        value: categoryId
        label: name
      }
    }
  }
`;