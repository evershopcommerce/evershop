import { Card } from '@components/admin/Card.js';
import Spinner from '@components/admin/Spinner';
import { SimplePageination } from '@components/common/SimplePagination';
import { CheckIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import React from 'react';
import { useFormContext } from 'react-hook-form';
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
  const { register, setValue } = useFormContext();
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
      <p className="text-red-500">
        There was an error fetching collections.
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <Card.Session title="Select a collection">
        <div>
          <div className="border rounded border-divider mb-5">
            <input
              type="text"
              value={inputValue}
              placeholder="Search collections"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <input
              type="hidden"
              {...register('settings[collection]')}
              defaultValue={selectedCollection}
            />
          </div>
          {fetching && (
            <div className="p-2 border border-divider rounded flex justify-center items-center">
              <Spinner width={25} height={25} />
            </div>
          )}
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
              {data.collections.items.map((collection) => (
                <div
                  key={collection.uuid}
                  className="grid grid-cols-8 gap-5 py-2 border-divider items-center"
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
                            setValue('settings[collection]', collection.code);
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
        <div className="flex justify-between gap-5">
          <label>
            <span className="block mb-2 font-medium">Number of products</span>
            <input
              type="text"
              {...register('settings[count]', {
                required: 'Count is required',
                valueAsNumber: true
              })}
              defaultValue={count}
              placeholder="Number of products"
            />
          </label>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="flex justify-between gap-5">
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
