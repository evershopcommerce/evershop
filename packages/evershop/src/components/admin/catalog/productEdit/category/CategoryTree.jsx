import Spinner from '@components/common/Spinner';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import CategoryItem from './CategoryItem';
import './CategoryTree.scss';

CategoryTree.propTypes = {};

const categoriesQuery = `
  query Query ($filters: [FilterInput]) {
    categories (filters: $filters) {
      items {
        categoryId,
        name
        path {
          name
        }
      }
    }
  }
`;

function CategoryTree({ selectedCategory, setSelectedCategory }) {
  const [result] = useQuery({
    query: categoriesQuery,
    variables: {
      filters: [{ key: 'parent', operation: 'eq', value: null }]
    }
  });
  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <div className="category-tree-container absolute top-full left-0 right-0 border rounded">
        <Spinner width={30} height={30} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="category-tree-container absolute top-full left-0 right-0 border rounded">
        <p className="text-critical">{error.message}</p>
      </div>
    );
  }
  if (data.categories.items.length === 0) {
    return (
      <div className="category-tree-container absolute top-full left-0 right-0 border rounded">
        <div>There is no category</div>
      </div>
    );
  }

  return (
    <div className="category-tree-container absolute top-full left-0 right-0 border rounded">
      <ul className="category-tree">
        {data.categories.items.map((category) => (
          <CategoryItem
            key={category.value}
            category={category}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        ))}
      </ul>
    </div>
  );
}

CategoryTree.propTypes = {
  selectedCategory: PropTypes.shape({
    categoryId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired
      })
    ),
    children: PropTypes.arrayOf(
      PropTypes.shape({
        categoryId: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        path: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired
          })
        )
      })
    )
  }),
  setSelectedCategory: PropTypes.func.isRequired
};

CategoryTree.defaultProps = {
  selectedCategory: {}
};

export default CategoryTree;
