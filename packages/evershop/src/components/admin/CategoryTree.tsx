import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { FolderIcon as Folder } from '@heroicons/react/24/outline';
import { MinusIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useQuery } from 'urql';
import './CategoryTree.scss';
import RenderIfTrue from '@components/common/RenderIfTrue.jsx';

export interface CategoryTreeItem {
  categoryId: number;
  name: string;
  hasChildren: boolean;
  path: Array<{ name: string }>;
  children?: Array<CategoryTreeItem>;
}

const categoriesQuery = `
  query Query ($filters: [FilterInput]) {
    categories (filters: $filters) {
      items {
        categoryId,
        name
        hasChildren
        path {
          name
        }
      }
    }
  }
`;

const childrenQuery = `
  query Query ($filters: [FilterInput]) {
    categories (filters: $filters) {
      items {
        categoryId,
        name
        path {
          name
        }
        hasChildren
      }
    }
  }
`;

const Skeleton = () => (
  <ul className="skeleton-wrapper-category-tree">
    <li className="skeleton mt-2" />
    <li className="skeleton mt-2" />
    <li className="skeleton mt-2" />
    <li className="skeleton mt-2" />
  </ul>
);

export interface CategoryItemProps {
  category: CategoryTreeItem;
  selectedCategories?: CategoryTreeItem[];
  onSelect: (category: CategoryTreeItem) => void;
}

function CategoryItem({
  category,
  selectedCategories,
  onSelect
}: CategoryItemProps) {
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
    return (
      <li className="text-critical">
        <span>{error.message}</span>
      </li>
    );
  }
  const className = selectedCategories?.find(
    (item) => item.categoryId === category.categoryId
  )
    ? 'flex justify-start gap-2 items-center p-2 rounded-md bg-green-100 transition-colors duration-500'
    : 'flex justify-start gap-2 items-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-500';
  return (
    <li className="[&_ul]:pl-2">
      <div className={className}>
        {category.hasChildren && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDownIcon width={15} height={15} />
            ) : (
              <ChevronRightIcon width={15} height={15} />
            )}
          </a>
        )}
        {!category.hasChildren && (
          <span className="text-gray-400">
            <MinusIcon width={11} height={15} />
          </span>
        )}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelect(category);
          }}
        >
          <div className="flex gap-2 justify-start items-center cursor-pointer">
            <Folder width={20} height={20} />
            <span className="text-sm">{category.name}</span>
          </div>
        </a>
      </div>
      {data && data.categories.items.length > 0 && expanded && (
        <div className="pb-2">
          <ul>
            {data.categories.items.map((child) => (
              <CategoryItem
                key={child.value}
                category={child}
                selectedCategories={selectedCategories}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      )}
      <RenderIfTrue condition={fetching && expanded}>
        <div className="pb-2">
          <Skeleton />
        </div>
      </RenderIfTrue>
    </li>
  );
}

CategoryItem.defaultProps = {
  category: {},
  selectedCategory: {}
};

interface CategoryTreeProps {
  selectedCategories?: CategoryTreeItem[];
  onSelect: (category: CategoryTreeItem) => void;
}

function CategoryTree({ selectedCategories, onSelect }: CategoryTreeProps) {
  const [result] = useQuery({
    query: categoriesQuery,
    variables: {
      filters: [{ key: 'parent', operation: 'eq', value: null }]
    }
  });
  const { data, fetching, error } = result;

  if (fetching) {
    return <Skeleton />;
  }
  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }
  if (!data || !data.categories || data.categories.items.length === 0) {
    return <div className="text-gray-400 text-md">There is no category</div>;
  }

  return (
    <ul className="category-tree">
      {data.categories.items.map((category) => (
        <CategoryItem
          key={category.value}
          category={category}
          selectedCategories={selectedCategories}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

CategoryTree.defaultProps = {
  selectedCategories: []
};

export { CategoryTree };
