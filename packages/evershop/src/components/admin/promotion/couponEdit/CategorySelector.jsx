import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { SimplePageination } from '@components/common/SimplePagination';
import Spinner from '@components/common/Spinner';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';

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

function CategorySelector({ onSelect, onUnSelect, selectedIDs, closeModal }) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
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
      <p className="text-critical">
        There was an error fetching categories.
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Select categories">
      <div className="modal-content">
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={inputValue || ''}
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
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
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
        <div className="flex justify-between gap-8">
          <SimplePageination
            total={data?.categories.total || 0}
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
  selectedIDs: PropTypes.arrayOf(PropTypes.number),
  closeModal: PropTypes.func.isRequired
};

CategorySelector.defaultProps = {
  selectedIDs: []
};

export default CategorySelector;
