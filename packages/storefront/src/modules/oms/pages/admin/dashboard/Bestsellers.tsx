import { Card } from '@components/admin/Card.js';
import React from 'react';
import './Bestsellers.scss';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';

interface BestSellersProps {
  bestSellers: Array<{
    name: string;
    price: {
      regular: {
        value: number;
        text: string;
      };
    };
    soldQty: number;
    image?: {
      url?: string;
    };
    editUrl?: string;
  }>;
  listUrl: string;
}

export default function BestSellers({
  bestSellers,
  listUrl
}: BestSellersProps) {
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
              <tr key={i}>
                <td>
                  <div className=" flex justify-left">
                    <div className="flex justify-start gap-2 items-center">
                      <div className="grid-thumbnail text-border border border-divider p-2 rounded">
                        {p.image?.url && (
                          <Image
                            src={p.image.url}
                            alt={p.name}
                            width={50}
                            height={50}
                          />
                        )}
                        {!p.image?.url && (
                          <ProductNoThumbnail width={50} height={50} />
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
        url
      }
      editUrl
    }
    listUrl: url(routeId: "productGrid")
  }
`;
