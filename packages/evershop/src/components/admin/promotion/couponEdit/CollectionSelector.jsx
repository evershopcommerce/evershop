import { Card } from '@components/admin/cms/Card';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import { SimplePageination } from '@components/common/SimplePagination';

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

function CollectionSelector({ onSelect, onUnSelect, selectedIDs, closeModal }) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: 'eq', value: inputValue },
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
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== null) {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  const { data, fetching, error } = result;

  if (error) {
    return (
      <p>
        There was an error fetching collections.
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Select Products">
      <div className="modal-content">
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={inputValue || ''}
                placeholder="Search collections"
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            {fetching && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
            {!fetching && data && (
              <div className="divide-y">
                {data.collections.items.length === 0 && (
                  <div className="p-3 border border-divider rounded flex justify-center items-center">
                    {inputValue ? (
                      <p>
                        No collections found for query &quot;{inputValue}&rdquo;
                      </p>
                    ) : (
                      <p>You have no collections to display</p>
                    )}
                  </div>
                )}
                {data.collections.items.map((collection) => (
                  <div
                    key={collection.uuid}
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
                  >
                    <div className="col-span-5">
                      <h3>{collection.name}</h3>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedIDs.includes(collection.collectionId) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            onSelect(collection.collectionId);
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedIDs.includes(collection.collectionId) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onUnSelect(collection.collectionId);
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
        </Card.Session>
      </div>
      <Card.Session>
        <div className="flex justify-between gap-8">
          <SimplePageination
            total={data?.collections.total || 0}
            count={data?.collections?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.collections.total}
            setPage={setPage}
          />
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

CollectionSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onUnSelect: PropTypes.func.isRequired,
  selectedIDs: PropTypes.arrayOf(PropTypes.number),
  closeModal: PropTypes.func.isRequired
};

CollectionSelector.defaultProps = {
  selectedIDs: []
};

export default CollectionSelector;
