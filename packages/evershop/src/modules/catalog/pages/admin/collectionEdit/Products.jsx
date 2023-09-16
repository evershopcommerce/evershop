import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/common/modal/useModal';
import './Products.scss';
import AddProducts from '@components/admin/catalog/collection/collectionEdit/AddProducts';
import Spinner from '@components/common/Spinner';

const ProductsQuery = `
  query Query ($code: String!, $filters: [FilterInput!]) {
    collection (code: $code) {
      products (filters: $filters) {
        items {
          productId
          uuid
          name
          sku
          price {
            regular {
              text
            }
          }
          image {
            url: thumb
          }
          editUrl
          removeFromCollectionUrl
        }
        total
      }
    }
  }
`;

export default function Products({
  collection: { collectionId, code, addProductApi }
}) {
  const [keyword, setKeyword] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [removing, setRemoving] = React.useState([]);
  const modal = useModal();

  // Run query again when page changes
  const [result, reexecuteQuery] = useQuery({
    query: ProductsQuery,
    variables: {
      code,
      filters: !keyword
        ? [
            { key: 'page', operation: '=', value: page.toString() },
            { key: 'limit', operation: '=', value: '10' }
          ]
        : [
            { key: 'page', operation: '=', value: page.toString() },
            { key: 'limit', operation: '=', value: '10' },
            { key: 'keyword', operation: '=', value: keyword }
          ]
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  const closeModal = () => {
    // Reexecute query to update products
    reexecuteQuery({ requestPolicy: 'network-only' });
    modal.closeModal();
  };

  const removeProduct = async (api, uuid) => {
    setRemoving([...removing, uuid]);
    await fetch(api, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });
    setPage(1);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [keyword]);

  React.useEffect(() => {
    if (result.fetching) {
      return;
    }
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  const { data, fetching, error } = result;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }
  if (data || fetching) {
    return (
      <Card
        title="Products"
        actions={[
          {
            name: 'Add products',
            onAction: () => {
              modal.openModal();
            }
          }
        ]}
      >
        {modal.state.showing && (
          <div
            className={modal.className}
            onAnimationEnd={modal.onAnimationEnd}
          >
            <div
              className="modal-wrapper flex self-center justify-center items-center"
              tabIndex={-1}
              role="dialog"
            >
              <div className="modal">
                <AddProducts
                  collectionId={collectionId}
                  addProductApi={addProductApi}
                  closeModal={closeModal}
                />
              </div>
            </div>
          </div>
        )}
        <Card.Session>
          <div>
            <div className="border rounded border-divider mb-2">
              <input
                type="text"
                value={keyword}
                placeholder="Search products"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            {data && (
              <>
                {data.collection.products.items.length === 0 && (
                  <div>No product to display.</div>
                )}
                <div className="flex justify-between">
                  <div>
                    <i>{data.collection.products.total} items</i>
                  </div>
                  <div>
                    {data.collection.products.total > 10 && (
                      <div className="flex justify-between gap-1">
                        {page > 1 && (
                          <a
                            className="text-interactive"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page - 1);
                            }}
                          >
                            Previous
                          </a>
                        )}
                        {page < data.collection.products.total / 10 && (
                          <a
                            className="text-interactive"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page + 1);
                            }}
                          >
                            Next
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {data.collection.products.items.map((p) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div
                      key={p.uuid}
                      className="grid grid-cols-8 gap-2 py-1 border-divider items-center"
                    >
                      <div className="grid-thumbnail text-border border border-divider p-075 rounded flex justify-center col-span-1">
                        {p.image?.url && (
                          <img
                            className="self-center"
                            src={p.image?.url}
                            alt=""
                          />
                        )}
                        {!p.image?.url && (
                          <svg
                            className="self-center"
                            xmlns="http://www.w3.org/2000/svg"
                            width="2rem"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="col-span-5">
                        <a
                          href={p.editUrl || ''}
                          className="font-semibold hover:underline"
                        >
                          {p.name}
                        </a>
                      </div>
                      <div className="col-span-2 text-right">
                        <a
                          href="#"
                          onClick={async (e) => {
                            e.preventDefault();
                            await removeProduct(
                              p.removeFromCollectionUrl,
                              p.uuid
                            );
                          }}
                          className="text-critical hover:first-letter:"
                        >
                          Remove
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {fetching && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
          </div>
        </Card.Session>
      </Card>
    );
  } else {
    return null;
  }
}

Products.propTypes = {
  collection: PropTypes.shape({
    collectionId: PropTypes.number,
    code: PropTypes.string,
    addProductApi: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 20
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      collectionId
      code
      addProductApi: addProductUrl
    }
  }
`;
