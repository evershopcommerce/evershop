import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const SearchQuery = `
  query Query ($query: String) {
    products: searchProducts(query: $query) {
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
    }
  }
`;

function AddProducts({ addProductApi, collectionId, closeModal }) {
  const [inputValue, setInputValue] = React.useState('');
  const [addedProducts, setAddedProducts] = React.useState([]);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: { query: inputValue },
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
    }, 1000);

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
      <Card.Session>
        <div>
          <input
            type="text"
            value={inputValue}
            placeholder="Search products"
            onChange={(e) => setInputValue(e.target.value)}
            className="border border-[#999]"
          />
          {fetching && (
            <div className="skeleton-wrapper-collection-products">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          )}
          {!fetching && data && (
            <div className="divide-y">
              {data.products.items.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-6 gap-2 py-2 border-divider"
                >
                  <div className="col-span-1">
                    <img src={product.image?.url} alt={product.name} />
                  </div>
                  <div className="col-span-4">
                    <h3>{product.name}</h3>
                    <p>{product.sku}</p>
                    <p>{product.price.regular.text}</p>
                  </div>
                  <div className="col-span-1">
                    {!addedProducts.includes(product.uuid) && (
                      <button
                        className="button secondary"
                        onClick={async (e) => {
                          e.preventDefault();
                          await addProduct(product.uuid);
                        }}
                      >
                        Add
                      </button>
                    )}
                    {addedProducts.includes(product.uuid) && (
                      <span className="button button-secondary">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card.Session>
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
  collectionId: PropTypes.number.isRequired,
  collectionProducts: PropTypes.arrayOf(PropTypes.number),
  closeModal: PropTypes.func.isRequired
};

AddProducts.defaultProps = {
  collectionProducts: []
};

export default AddProducts;
