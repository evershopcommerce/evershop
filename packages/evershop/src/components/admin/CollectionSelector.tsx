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
      <p className="text-destructive">
        {_('There was an error fetching collections.')}
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
            placeholder={_('Search collections')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setLoading(true);
            }}
          />
        </div>
        {(fetching || loading) && <CollectionListSkeleton />}
        {!fetching && data && (
          <div className="divide-y">
            {data.collections.items.length === 0 && (
              <div className="p-2 border border-divider rounded flex justify-center items-center">
                {inputValue ? (
                  <p>
                    {_('No collections found for query "${query}"', {
                      query: inputValue
                    })}
                  </p>
                ) : (
                  <p>{_('You have no collections to display')}</p>
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
                    <Button
                      variant="outline"
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
                      {_('Select')}
                    </Button>
                  )}
                  {isCollectionSelected(c, internalSelectedCollections) && (
                    <Button
                      variant="default"
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
                      <Check width={20} height={20} />
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
