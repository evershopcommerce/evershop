import { Card } from '@components/admin/Card.js';
import { ProductListSkeleton } from '@components/admin/ProductListSkeleton.js';
import { ProductSelector } from '@components/admin/ProductSelector.js';
import Button from '@components/common/Button.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

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
            url
          }
          editUrl
          removeFromCollectionUrl
        }
        total
      }
    }
  }
`;

interface ProductsProps {
  collection: {
    code: string;
    addProductApi: string;
  };
}

export default function Products({
  collection: { code, addProductApi }
}: ProductsProps) {
  const [keyword, setKeyword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [removing, setRemoving] = React.useState<string[]>([]);
  const modal = useModal();

  const addProductFunction = async (sku, uuid) => {
    const response = await fetch(addProductApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: uuid
      }),
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) {
      toast.error(data.message);
    } else {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  // Run query again when page changes
  const [result, reexecuteQuery] = useQuery({
    query: ProductsQuery,
    variables: {
      code,
      filters: !keyword
        ? [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' }
          ]
        : [
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: '10' },
            { key: 'keyword', operation: 'eq', value: keyword }
          ]
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

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
      setLoading(false);
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

  return (
    <Card
      title="Products"
      actions={[
        {
          name: 'Add products',
          onAction: () => {
            modal.open();
          }
        }
      ]}
    >
      {error && (
        <Card.Session>
          <span className="text-critical">{error.message}</span>
        </Card.Session>
      )}
      {data && (
        <Modal title="Add Products" onClose={modal.close} isOpen={modal.isOpen}>
          <ProductSelector
            onSelect={addProductFunction}
            selectedProducts={data.collection.products.items.map((p) => ({
              sku: p.sku,
              uuid: p.uuid,
              productId: p.productId
            }))}
          />
        </Modal>
      )}
      <Card.Session>
        <div>
          <div className="mb-5">
            <div className="form-field">
              <input
                className=""
                type="text"
                value={keyword}
                placeholder="Search products"
                onChange={(e) => {
                  setLoading(true);
                  setKeyword(e.target.value);
                }}
              />
            </div>
          </div>
          {data && !loading && (
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
                    <div className="flex justify-between gap-2">
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
                  <div
                    key={p.uuid}
                    className="flex justify-between py-2 border-divider items-center"
                  >
                    <div className="flex justify-items-start gap-5">
                      <div className="grid-thumbnail text-border border border-divider p-2 rounded flex justify-center w-10 h-10">
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
                      <div>
                        <a
                          href={p.editUrl || ''}
                          className="font-semibold hover:underline"
                        >
                          {p.name}
                        </a>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button
                        title="Remove"
                        variant="danger"
                        onAction={async () => {
                          await removeProduct(
                            p.removeFromCollectionUrl,
                            p.uuid
                          );
                        }}
                        isLoading={removing.includes(p.uuid)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {(fetching || loading) && <ProductListSkeleton />}
        </div>
      </Card.Session>
    </Card>
  );
}

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
