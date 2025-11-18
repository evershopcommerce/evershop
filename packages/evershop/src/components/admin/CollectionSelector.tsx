import { SimplePagination } from '@components/common/SimplePagination.js';
import { CheckIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useQuery } from 'urql';
import './CollectionSelector.scss';
import { AtLeastOne } from '../../types/atLeastOne.js';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    collections(filters: $filters) {
      items {
        collectionId
        uuid
        name
      }
      total
    }
  }
`;

interface CollectionIdentifier {
  collectionId?: string | number;
  uuid?: string;
}

const CollectionListSkeleton: React.FC = () => {
  const skeletonItems = Array(5).fill(0);

  return (
    <div className="collection-list-skeleton">
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="collection-skeleton-item border-b flex justify-between items-center"
        >
          <div className="flex items-center">
            <div>
              <div className="skeleton-title h-5 w-30 bg-gray-200 rounded skeleton-pulse mb-2"></div>
              <div className="skeleton-id h-4 w-20 bg-gray-200 rounded skeleton-pulse"></div>
            </div>
          </div>
          <div className="select-button">
            <div className="skeleton-button h-6 w-12 bg-gray-200 rounded skeleton-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const isCollectionSelected = (
  collection: CollectionIdentifier,
  selectedCollections: AtLeastOne<CollectionIdentifier>[]
): boolean => {
  return selectedCollections.some(
    (selected) =>
      (selected?.collectionId &&
        selected.collectionId === collection.collectionId) ||
      (selected?.uuid && selected.uuid === collection.uuid)
  );
};

const CollectionSelector: React.FC<{
  onSelect: (id: string | number, uuid: string, name: string) => void;
  onUnSelect: (id: string | number, uuid: string, name: string) => void;
  selectedCollections: AtLeastOne<CollectionIdentifier>[];
}> = ({ onSelect, onUnSelect, selectedCollections }) => {
  const [internalSelectedCollections, setInternalSelectedCollections] =
    React.useState<AtLeastOne<CollectionIdentifier>[]>(
      selectedCollections || []
    );
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
      collections: {
        items: Array<{
          collectionId: string | number;
          uuid: string;
          name: string;
        }>;
        total: number;
      };
    };
    fetching: boolean;
    error: Error | undefined;
  };

  if (error) {
    return (
      <p className="text-critical">
        There was an error fetching collections.
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div>
        <div className="p-2">
          <div className="form-field">
            <input
              type="text"
              value={inputValue || ''}
              placeholder="Search collections"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setInputValue(e.target.value);
                setLoading(true);
              }}
            />
          </div>
        </div>
        {(fetching || loading) && <CollectionListSkeleton />}
        {!fetching && data && (
          <div className="divide-y">
            {data.collections.items.length === 0 && (
              <div className="p-2 border border-divider rounded flex justify-center items-center">
                {inputValue ? (
                  <p>
                    No collections found for query &quot;{inputValue}&rdquo;
                  </p>
                ) : (
                  <p>You have no collections to display</p>
                )}
              </div>
            )}
            {data.collections.items.map((c) => (
              <div
                key={c.uuid}
                className="grid grid-cols-8 gap-5 py-2 border-divider items-center"
              >
                <div className="col-span-5">
                  <h3>{c.name}</h3>
                </div>
                <div className="col-span-3 text-right">
                  {!isCollectionSelected(c, internalSelectedCollections) && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={async (e) => {
                        e.preventDefault();
                        setInternalSelectedCollections((prev) => [
                          ...prev,
                          {
                            collectionId: c.collectionId,
                            uuid: c.uuid,
                            name: c.name
                          }
                        ]);
                        onSelect(c.collectionId, c.uuid, c.name);
                      }}
                    >
                      Select
                    </button>
                  )}
                  {isCollectionSelected(c, internalSelectedCollections) && (
                    <a
                      className="button primary"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setInternalSelectedCollections((prev) =>
                          prev.filter(
                            (c) =>
                              c.collectionId !== c.collectionId &&
                              c.uuid !== c.uuid
                          )
                        );
                        onUnSelect(c.collectionId, c.uuid, c.name);
                      }}
                    >
                      <CheckIcon width={20} height={20} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-5">
        <SimplePagination
          total={data?.collections.total || 0}
          count={data?.collections?.items?.length || 0}
          page={page}
          hasNext={limit * page < data?.collections.total}
          setPage={setPage}
        />
      </div>
    </div>
  );
};

export { CollectionSelector };
