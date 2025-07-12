import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { SimplePageination } from '@components/common/SimplePagination';
import Spinner from '@components/common/Spinner';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    products(filters: $filters) {
      items {
        productId
        uuid
        sku
        name
        price {
          regular {
            text
          }
        }
        image {
          url: thumb
        }
      }
      total
    }
  }
`;

function ProductSkuSelector({
  onSelect,
  onUnSelect,
  selectedChecker,
  closeModal
}) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'keyword', operation: 'eq', value: inputValue },
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

  const selectProduct = async (sku, uuid, productId) => {
    try {
      await onSelect(sku, uuid, productId);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const unSelectProduct = async (sku, uuid, productId) => {
    try {
      await onUnSelect(sku, uuid, productId);
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
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
        There was an error fetching products.
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
                placeholder="Search products"
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setLoading(true);
                }}
              />
            </div>
            {(fetching || loading) && (
              <div className="p-3 border border-divider rounded flex justify-center items-center">
                <Spinner width={25} height={25} />
              </div>
            )}
            {!fetching && data && !loading && (
              <div className="divide-y">
                {data.products.items.length === 0 && (
                  <div className="p-3 border border-divider rounded flex justify-center items-center">
                    {inputValue ? (
                      <p>
                        No products found for query &quot;{inputValue}&rdquo;
                      </p>
                    ) : (
                      <p>You have no products to display</p>
                    )}
                  </div>
                )}
                {data.products.items.map((product) => (
                  <div
                    key={product.uuid}
                    className="grid grid-cols-8 gap-8 py-4 border-divider items-center"
                  >
                    <div className="col-span-1">
                      <div className="text-border border border-divider p-3 rounded flex justify-center">
                        {product.image?.url && (
                          <img src={product.image?.url} alt={product.name} />
                        )}
                        {!product.image?.url && (
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
                    </div>
                    <div className="col-span-5">
                      <h3>{product.name}</h3>
                      <p>{product.sku}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedChecker(product) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await selectProduct(
                              product.sku,
                              product.uuid,
                              product.productId
                            );
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedChecker(product) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            unSelectProduct(
                              product.sku,
                              product.uuid,
                              product.productId
                            );
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
            total={data?.products.total || 0}
            count={data?.products?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.products.total}
            setPage={setPage}
          />
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

ProductSkuSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onUnSelect: PropTypes.func.isRequired,
  selectedChecker: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired
};

export default ProductSkuSelector;
