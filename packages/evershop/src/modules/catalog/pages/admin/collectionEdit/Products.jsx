import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { Card } from '@components/admin/cms/Card';
import { useModal } from '@components/common/modal/useModal';
import './Products.scss';
import AddProducts from '@components/admin/catalog/collection/collectionEdit/AddProducts';

const ProductsQuery = `
  query Query ($code: String!, $page: String!) {
    collection (code: $code) {
      products (filters: [{key: "page", operation: "=", value: $page}]) {
        items {
          productId
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
      }
    }
  }
`;

export default function Products({
  collection: { collectionId, code, addProductApi }
}) {
  const [page, setPage] = React.useState(1);
  const modal = useModal();

  // Run query again when page changes
  const [result, reexecuteQuery] = useQuery({
    query: ProductsQuery,
    variables: { code: code, page: page.toString() }
  });

  const closeModal = () => {
    // Reexecute query to update products
    reexecuteQuery({ requestPolicy: 'network-only' });
    modal.closeModal();
  };

  const removeProduct = async (api) => {
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
  if (fetching) {
    return (
      <Card title="Products">
        <div className="skeleton-wrapper-collection-products">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </Card>
    );
  } else {
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
            {data.collection.products.items.length === 0 && (
              <div>This collection has no product.</div>
            )}
            <div className="divide-y">
              {data.collection.products.items.map((p, i) => {
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <div
                    key={i}
                    className="grid grid-cols-6 gap-2 py-1 border-divider"
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
                    <div className="col-span-4">
                      <a
                        href={p.editUrl || ''}
                        className="font-semibold hover:underline"
                      >
                        {p.name}
                      </a>
                    </div>
                    <div className="col-span-1">
                      <a
                        href="#"
                        className="button button-primary"
                        onClick={async (e) => {
                          e.preventDefault();
                          await removeProduct(p.removeFromCollectionUrl);
                        }}
                      >
                        Remove
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card.Session>
      </Card>
    );
  }
}

Products.propTypes = {
  api: PropTypes.string.isRequired,
  listUrl: PropTypes.string.isRequired
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
    addProductApi: url(routeId: "bestsellers")
  }
`;
