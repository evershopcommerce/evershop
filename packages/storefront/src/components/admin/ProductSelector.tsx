import { SimplePagination } from '@components/common/SimplePagination.js';
import { CheckIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { AtLeastOne } from '../../types/atLeastOne.js';
import { ProductListSkeleton } from './ProductListSkeleton.js';

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
          url
        }
      }
      total
    }
  }
`;

type ProductIdentifier = {
  sku?: string;
  uuid?: string;
  productId?: string;
};

const isProductSelected = (
  product: ProductIdentifier,
  selectedProducts: Array<AtLeastOne<ProductIdentifier>>
): boolean => {
  return selectedProducts.some(
    (selected) =>
      (selected?.sku && selected.sku === product.sku) ||
      (selected?.uuid && selected.uuid === product.uuid) ||
      (selected?.productId && selected.productId === product.productId)
  );
};

const ProductSelector: React.FC<{
  onSelect: (
    sku: string,
    uuid: string,
    productId: string
  ) => Promise<void> | void;
  onUnSelect?: (
    sku: string,
    uuid: string,
    productId: string
  ) => Promise<void> | void;
  selectedProducts: Array<AtLeastOne<ProductIdentifier>>;
}> = ({ onSelect, onUnSelect, selectedProducts }) => {
  const limit = 10;
  const [internalSelectedProducts, setSelectedProducts] = React.useState<
    Array<AtLeastOne<ProductIdentifier>>
  >(selectedProducts || []);
  const [inputValue, setInputValue] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState<number>(1);

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

  const selectProduct = async (
    sku: string,
    uuid: string,
    productId: string
  ) => {
    setSelectedProducts((prev) => [...prev, { sku, uuid, productId }]);
    try {
      await onSelect(sku, uuid, productId);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const unSelectProduct = async (
    sku: string,
    uuid: string,
    productId: string
  ) => {
    if (!onUnSelect) {
      return;
    }
    setSelectedProducts((prev) =>
      prev.filter((product) => product?.sku !== sku)
    );
    try {
      await onUnSelect(sku, uuid, productId);
    } catch (e) {
      toast.error(e.message);
    }
  };

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (inputValue !== null) {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, fetching, error } = result;

  if (error) {
    return (
      <p className="text-critical">
        There was an error fetching products.
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="p-2">
        <div className="form-field">
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
      </div>
      {(fetching || loading) && <ProductListSkeleton />}
      {!fetching && data && !loading && (
        <div className="divide-y">
          {data.products.items.length === 0 && (
            <div className="p-2 border border-divider rounded flex justify-center items-center">
              {inputValue ? (
                <p>No products found for query &quot;{inputValue}&rdquo;</p>
              ) : (
                <p>You have no products to display</p>
              )}
            </div>
          )}
          {data.products.items.map((product) => (
            <div
              key={product.uuid}
              className="grid grid-cols-8 gap-5 py-2 border-divider items-center"
            >
              <div className="col-span-1">
                <div className="text-border border border-divider p-2 rounded flex justify-center w-10 h-10">
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
                {!isProductSelected(product, internalSelectedProducts) && (
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
                {isProductSelected(product, internalSelectedProducts) && (
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
                    <CheckIcon width={'1.2rem'} height={'1.2rem'} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between gap-5 pt-5">
        <SimplePagination
          total={data?.products.total || 0}
          count={data?.products?.items?.length || 0}
          page={page}
          hasNext={limit * page < data?.products.total}
          setPage={setPage}
        />
      </div>
    </div>
  );
};

export { ProductSelector };
