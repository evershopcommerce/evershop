import { Card } from '@components/admin/cms/Card';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import CheckIcon from '@heroicons/react/outline/CheckIcon';
import { SimplePageination } from '@components/common/SimplePagination';

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
  selectedSKUs,
  closeModal
}) {
  const limit = 10;
  const [inputValue, setInputValue] = React.useState(null);
  const [page, setPage] = React.useState(1);
  // const [selectedProducts, setSelectedProducts] = React.useState(selectedSKUs);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'keyword', operation: '=', value: inputValue },
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

  const selectProduct = async (sku) => {
    try {
      await onSelect(sku);
      // setSelectedProducts([...selectedProducts, sku]);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const unSelectProduct = async (sku) => {
    try {
      await onUnSelect(sku);
      // setSelectedProducts(selectedProducts.filter((e) => e !== sku));
    } catch (e) {
      toast.error(e.message);
    }
  };

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
            <div className="border rounded border-divider mb-2">
              <input
                type="text"
                value={inputValue}
                placeholder="Search products"
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
                    className="grid grid-cols-8 gap-2 py-1 border-divider items-center"
                  >
                    <div className="col-span-1">
                      <img src={product.image?.url} alt={product.name} />
                    </div>
                    <div className="col-span-5">
                      <h3>{product.name}</h3>
                      <p>{product.sku}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      {!selectedSKUs.includes(product.sku) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await selectProduct(product.sku);
                          }}
                        >
                          Select
                        </button>
                      )}
                      {selectedSKUs.includes(product.sku) && (
                        <a
                          className="button primary"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            unSelectProduct(product.sku);
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
            total={data?.products.total}
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
  selectedSKUs: PropTypes.arrayOf(PropTypes.string),
  closeModal: PropTypes.func.isRequired
};

ProductSkuSelector.defaultProps = {
  selectedSKUs: []
};

export default ProductSkuSelector;
