import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { SimplePageination } from '@components/common/SimplePagination';
import Spinner from '@components/common/Spinner';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    collections(filters: $filters) {
      items {
        collectionId
        uuid
        code
        name
      }
      total
    }
  }
`;

function CollectionProductsSetting({
  collectionProductsWidget: { collection, count }
}) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [selectedCollection, setSelectedCollection] =
    React.useState(collection);
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
      <p>
        There was an error fetching collections.
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="modal-content">
        <Card.Session title="Select a collection">
          <div>
            <div className="border rounded border-divider mb-8">
              <input
                type="text"
                value={inputValue}
                placeholder="Search collections"
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Field
                type="hidden"
                name="settings[collection]"
                value={selectedCollection}
                validationRules={['notEmpty']}
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
                    <div className="col-span-6">
                      <h3>{collection.name}</h3>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="flex items-center">
                        {!(collection.code === selectedCollection) && (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedCollection(collection.code);
                            }}
                          >
                            Select
                          </button>
                        )}
                        {collection.code === selectedCollection && (
                          <CheckIcon width={20} height={20} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card.Session>
        <Card.Session title="Number of products to display">
          <div className="flex justify-between gap-8">
            <Field
              type="text"
              name="settings[count]"
              value={count}
              validationRules={['notEmpty']}
            />
          </div>
        </Card.Session>
      </div>
      <Card.Session>
        <div className="flex justify-between gap-8">
          <SimplePageination
            total={data?.collections.total}
            count={data?.collections?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.collections.total}
            setPage={setPage}
          />
        </div>
      </Card.Session>
    </div>
  );
}

CollectionProductsSetting.propTypes = {
  collectionProductsWidget: PropTypes.shape({
    collection: PropTypes.string,
    count: PropTypes.number
  })
};

CollectionProductsSetting.defaultProps = {
  collectionProductsWidget: {
    collection: '',
    count: 5
  }
};

export default CollectionProductsSetting;

export const query = `
  query Query($collection: String, $count: Int) {
    collectionProductsWidget(collection: $collection, count: $count) {
      collection
      count
    }
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count")
}`;
