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
    categories(filters: $filters) {
      items {
        categoryId
        uuid
        name
      }
      total
    }
  }
`;

function CategorySelector({ onSelect, onUnSelect, selectedIDs, closeModal }) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: '=', value: inputValue },
            { key: 'page', operation: '=', value: page.toString() },
            { key: 'limit', operation: '=', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: '=', value: limit.toString() },
            { key: 'page', operation: '=', value: page.toString() }
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
        There was an error fetching categories.
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Select Products">
      <div className="modal-content">
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-2">
              <input
                type="text"
                value={inputValue}
                placeholder="Search categories"
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
                {data.categories.items.length === 0 && (
                  <div className="p-3 border border-divider rounded flex justify-center items-center">
                    {inputValue ? (
                      <p>
                        No categories found for query &quot;{inputValue}&rdquo;
                      </p>
                    ) : (
                      <p>You have no categories to display</p>
                    )}
                  </div>
                )}
                {data.categories.items.map((cat) => (
                  <div
                    key={cat.uuid}
                    className="grid grid-cols-8 gap-2 py-1 border-divider items-center"
                  >
                    <div className="col-span-5">
                      <h3>{cat.name}</h3>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedIDs.includes(cat.categoryId) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            onSelect(cat.categoryId);
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedIDs.includes(cat.categoryId) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onUnSelect(cat.categoryId);
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
        <div className="flex justify-between gap-2">
          <SimplePageination
            total={data?.categories.total}
            count={data?.categories?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.categories.total}
            setPage={setPage}
          />
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

CategorySelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onUnSelect: PropTypes.func.isRequired,
  selectedIDs: PropTypes.arrayOf(PropTypes.string),
  closeModal: PropTypes.func.isRequired
};

CategorySelector.defaultProps = {
  selectedIDs: []
};

export default CategorySelector;
