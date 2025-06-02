
import Spinner from '@components/common/Spinner';
import MinusSmall from '@heroicons/react/outline/MinusSmIcon';
import PlusSmall from '@heroicons/react/outline/PlusSmIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';

const childrenQuery = `
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

function CategoryItem({ category, selectedCategory, setSelectedCategory }) {
  const [expanded, setExpanded] = React.useState(false);
  const [result] = useQuery({
    query: childrenQuery,
    variables: {
      filters: [{ key: 'parent', operation: 'eq', value: category.categoryId }]
    },
    pause: !expanded
  });

  const { data, fetching, error } = result;

  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }
  return (
    <li>
      <div className="flex justify-start gap-4 items-center">
        {!category.children && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <MinusSmall width={15} height={15} />
            ) : (
              <PlusSmall width={15} height={15} />
            )}
          </a>
        )}
        {fetching && (
          <span>
            <Spinner width={20} height={20} />
          </span>
        )}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelectedCategory(category);
          }}
        >
          {category.categoryId === selectedCategory?.categoryId ? (
            <strong>{category.name}</strong>
          ) : (
            category.name
          )}
        </a>
      </div>
      {data && data.categories.items.length > 0 && expanded && (
        <ul>
          {data.categories.items.map((child) => (
            <CategoryItem
              key={child.value}
              category={child}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

CategoryItem.propTypes = {
  category: PropTypes.shape({
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
  selectedCategory: PropTypes.shape({
    categoryId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired
      })
    )
  }),
  setSelectedCategory: PropTypes.func.isRequired
};

CategoryItem.defaultProps = {
  category: {},
  selectedCategory: {}
};

export default CategoryItem;
