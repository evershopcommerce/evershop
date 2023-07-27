import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useAppState } from '@components/common/context/app';
import { Card } from '@components/admin/cms/Card';
import './Bestsellers.scss';

export default function BestSellers({ api, listUrl }) {
  const context = useAppState();
  const currency = context.currency || 'USD';
  const [products, setProducts] = React.useState([]);
  const [fetching, setFetching] = React.useState(true);

  React.useEffect(() => {
    if (window !== undefined) {
      fetch(api, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then((response) => response.json())
        .then((json) => {
          setProducts(json);
          setFetching(false);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }
  }, []);
  if (fetching) {
    return (
      <Card title="Best Sellers">
        <div className="skeleton-wrapper-bestsellers">
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
        title="Best Sellers"
        actions={[
          {
            name: 'All products',
            onAction: () => {
              window.location.href = listUrl;
            }
          }
        ]}
      >
        <Card.Session>
          <table className="listing bestsellers">
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td align="left">
                    Look like you just started. No bestsellers yet.
                  </td>
                  <td> </td>
                </tr>
              )}
              {products.map((p, i) => {
                const formatedPrice = new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency
                }).format(p.price);
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td>
                      <div
                        className="grid-thumbnail text-border border border-divider p-075 rounded flex justify-center"
                        style={{ width: '6rem', height: '6rem' }}
                      >
                        {p.imageUrl && (
                          <img
                            className="object-cover"
                            src={p.imageUrl}
                            alt=""
                          />
                        )}
                        {!p.imageUrl && (
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
                    </td>
                    <td>
                      <a
                        href={p.editUrl || ''}
                        className="font-semibold hover:underline"
                      >
                        {p.name}
                      </a>
                    </td>
                    <td>{formatedPrice}</td>
                    <td>{p.qty} sold</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card.Session>
      </Card>
    );
  }
}

BestSellers.propTypes = {
  api: PropTypes.string.isRequired,
  listUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    api: url(routeId: "bestsellers")
    listUrl: url(routeId: "productGrid")
  }
`;
