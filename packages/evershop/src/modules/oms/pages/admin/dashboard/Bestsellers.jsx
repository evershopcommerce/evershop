import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '@components/admin/cms/Card';
import './Bestsellers.scss';

export default function BestSellers({ bestSellers, listUrl }) {
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
            {bestSellers.length === 0 && (
              <tr>
                <td align="left">
                  Look like you just started. No bestsellers yet.
                </td>
                <td> </td>
              </tr>
            )}
            {bestSellers.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i}>
                <td>
                  <div className=" flex justify-left">
                    <div className="flex justify-start gap-4 items-center">
                      <div
                        className="grid-thumbnail text-border border border-divider p-3 rounded"
                        style={{ width: '6rem' }}
                      >
                        {p.image?.thumb && (
                          <img
                            className="object-cover"
                            src={p.image?.thumb}
                            alt=""
                          />
                        )}
                        {!p.image?.thumb && (
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
                  </div>
                </td>
                <td />
                <td>{p.price.regular.text}</td>
                <td>{p.soldQty} sold</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

BestSellers.propTypes = {
  bestSellers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      price: PropTypes.shape({
        regular: PropTypes.shape({
          value: PropTypes.number,
          text: PropTypes.string
        })
      }),
      soldQty: PropTypes.number,
      image: PropTypes.shape({
        thumb: PropTypes.string
      }),
      editUrl: PropTypes.string
    })
  ).isRequired,
  listUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    bestSellers {
      name
      price {
        regular {
          value
          text
        }
      }
      soldQty
      image {
        thumb
      }
      editUrl
    }
    listUrl: url(routeId: "productGrid")
  }
`;
