import { Card } from '@components/admin/cms/Card';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import CheckIcon from '@heroicons/react/outline/CheckIcon';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    products(filters: $filters) {
      items {
        productId
        uuid
        sku
        category {
          categoryId
        }
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

function AddProducts({ addProductApi, categoryId, closeModal }) {
  const [inputValue, setInputValue] = React.useState('');
  const [addedProducts, setAddedProducts] = React.useState([]);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [{ key: 'keyword', operation: '=', value: inputValue }]
        : []
    },
    pause: true
  });

  const addProduct = async (productId) => {
    const response = await fetch(addProductApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId
      }),
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) {
      toast.error(data.message);
    } else {
      setAddedProducts([...addedProducts, productId]);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, fetching, error } = result;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Add Products">
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
            {!data && (
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
                      {!(
                        addedProducts.includes(product.uuid) ||
                        parseInt(product.category?.categoryId, 10) ===
                          parseInt(categoryId, 10)
                      ) && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await addProduct(product.uuid);
                          }}
                        >
                          Add
                        </button>
                      )}
                      {(addedProducts.includes(product.uuid) ||
                        parseInt(product.category?.categoryId, 10) ===
                          parseInt(categoryId, 10)) && (
                        <span className="button primary">
                          <CheckIcon width={20} height={20} />
                        </span>
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
        <div className="flex justify-end">
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </div>
      </Card.Session>
    </Card>
  );
}

AddProducts.propTypes = {
  addProductApi: PropTypes.string.isRequired,
  categoryId: PropTypes.number.isRequired,
  closeModal: PropTypes.func.isRequired
};

export default AddProducts;
