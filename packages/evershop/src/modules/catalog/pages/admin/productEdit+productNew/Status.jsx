import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import { useQuery } from 'urql';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';

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

export function Category({ product }) {
  const [categories, setCategories] = React.useState(
    product ? product.categories : []
  );
  const [result] = useQuery({
    query: categoryQuery
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-1">Category</div>
      <Select
        name="categories[]"
        options={data.categories.items}
        hideSelectedOptions
        isMulti
        defaultValue={categories}
        onChange={(value) => setCategories(value.map((item) => item.value))}
      />
      {categories.length === 0 && (
        <input type="hidden" name="categories[0]" value="0" />
      )}
    </div>
  );
}

Category.propTypes = {
  product: PropTypes.shape({
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.number.isRequired,
        label: PropTypes.string.isRequired
      })
    )
  })
};

Category.defaultProps = {
  product: {
    categories: []
  }
};

export default function Status({ product }) {
  return (
    <Card title="Product status" subdued>
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product?.status}
          label="Status"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="visibility"
          name="visibility"
          value={product?.visibility}
          label="Visibility"
          options={[
            { value: 0, text: 'Not visible' },
            { value: 1, text: 'Visible' }
          ]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Category product={product} />
      </Card.Session>
    </Card>
  );
}

Status.propTypes = {
  product: PropTypes.shape({
    status: PropTypes.number.isRequired,
    visibility: PropTypes.number.isRequired
  })
};

Status.defaultProps = {
  product: {
    status: 1,
    visibility: 1
  }
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

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
