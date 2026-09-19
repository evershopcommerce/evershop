import { SimplePagination } from '@components/common/SimplePagination.js';
import { Button } from '@components/common/ui/Button.js';
import { Input } from '@components/common/ui/Input.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Check } from 'lucide-react';
import React from 'react';
import { useQuery } from 'urql';
import { AtLeastOne } from '../../types/atLeastOne.js';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    categories(filters: $filters) {
      items {
        categoryId
        uuid
        name
        path {
          name
        }
      }
      total
    }
  }
`;

interface CategoryIdentifier {
  categoryId?: string | number;
  uuid?: string;
}

const CategoryListSkeleton: React.FC = () => {
  const skeletonItems = Array(5).fill(0);

  return (
    <div className="attribute-group-list-skeleton space-y-2 divide-y">
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="attribute-group-skeleton-item border-border pb-2 flex justify-between items-center "
        >
          <div className="flex items-center">
            <Skeleton className="h-5 w-30 rounded"></Skeleton>
          </div>
          <div className="select-button">
            <Skeleton className="h-6 w-12 rounded"></Skeleton>
          </div>
        </div>
      ))}
    </div>
  );
};

const isCategorySelected = (
  category: CategoryIdentifier,
  selectedCategories: AtLeastOne<CategoryIdentifier>[]
): boolean => {
  return selectedCategories.some(
    (selected) =>
      (selected?.categoryId && selected.categoryId === category.categoryId) ||
      (selected?.uuid && selected.uuid === category.uuid)
  );
};

const CategorySelector: React.FC<{
  onSelect: (id: string | number, uuid: string, name: string) => void;
  onUnSelect: (id: string | number, uuid: string, name: string) => void;
  selectedCategories: AtLeastOne<CategoryIdentifier>[];
}> = ({ onSelect, onUnSelect, selectedCategories }) => {
  const [internalSelectedCategories, setInternalSelectedCategories] =
    React.useState<AtLeastOne<CategoryIdentifier>[]>(selectedCategories || []);
  const [loading, setLoading] = React.useState<boolean>(false);
  const limit = 10;
  const [inputValue, setInputValue] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: 'like', value: inputValue },
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: 'eq', value: limit.toString() },
            { key: 'page', operation: 'eq', value: page.toString() }
          ]
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (inputValue !== '') {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, fetching, error } = result as {
    data: {
      categories: {
        items: Array<{
          categoryId: string | number;
          uuid: string;
          name: string;
          path: Array<{ name: string }>;
        }>;
        total: number;
      };
    };
    fetching: boolean;
    error: Error | undefined;
  };

  if (error) {
    return (
      <p className="text-destructive">
        {_('There was an error fetching categories.')}
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div>
        <div className="p-2">
          <Input
            type="text"
            value={inputValue || ''}
            placeholder={_('Search categories')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setLoading(true);
            }}
          />
        </div>
        {(fetching || loading) && <CategoryListSkeleton />}
        {!fetching && data && (
          <div className="divide-y">
            {data.categories.items.length === 0 && (
              <div className="p-2 border border-divider rounded flex justify-center items-center">
                {inputValue ? (
                  <p>
                    {_('No categories found for query "${query}"', {
                      query: inputValue
                    })}
                  </p>
                ) : (
                  <p>{_('You have no categories to display')}</p>
                )}
              </div>
            )}
            {data.categories.items.map((cat) => (
              <div
                key={cat.uuid}
                className="grid grid-cols-8 gap-5 py-2 border-divider items-center"
              >
                <div className="col-span-5">
                  <h3>
                    {cat.path.map((item, index) => (
                      <span key={item.name} className="text-gray-500">
                        {item.name}
                        {index < cat.path.length - 1 && ' > '}
                      </span>
                    ))}
                  </h3>
                </div>
                <div className="col-span-3 text-right">
                  {!isCategorySelected(cat, internalSelectedCategories) && (
                    <Button
                      variant={'outline'}
                      onClick={async (e) => {
                        e.preventDefault();
                        setInternalSelectedCategories((prev) => [
                          ...prev,
                          {
                            categoryId: cat.categoryId,
                            uuid: cat.uuid,
                            name: cat.name
                          }
                        ]);
                        onSelect(cat.categoryId, cat.uuid, cat.name);
                      }}
                    >
                      {_('Select')}
                    </Button>
                  )}
                  {isCategorySelected(cat, internalSelectedCategories) && (
                    <Button
                      variant={'default'}
                      onClick={(e) => {
                        e.preventDefault();
                        setInternalSelectedCategories((prev) =>
                          prev.filter(
                            (c) =>
                              c.categoryId !== cat.categoryId &&
                              c.uuid !== cat.uuid
                          )
                        );
                        onUnSelect(cat.categoryId, cat.uuid, cat.name);
                      }}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-5">
        <SimplePagination
          total={data?.categories.total || 0}
          count={data?.categories?.items?.length || 0}
          page={page}
          hasNext={limit * page < data?.categories.total}
          setPage={setPage}
        />
      </div>
    </div>
  );
};

export { CategorySelector };
