import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import './Bestsellers.scss';
import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import {
  Table,
  TableRow,
  TableBody,
  TableCell
} from '@components/common/ui/Table.js';

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
    <Card>
      <CardHeader>
        <CardTitle>{_('Best Sellers')}</CardTitle>
        <CardDescription>{_('A list of best selling products')}</CardDescription>
        <CardAction>
          <a href={listUrl} className="text-sm text-primary hover:underline">
            {_('View All Products')}
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {bestSellers.length === 0 && (
              <TableRow>
                <TableCell align="left">
                  {_('Look like you just started. No bestsellers yet.')}
                </TableCell>
                <TableCell> </TableCell>
              </TableRow>
            )}
            {bestSellers.map((p, i) => (
              <TableRow key={i}>
                <TableCell>
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
                </TableCell>
                <TableCell />
                <TableCell>{p.price.regular.text}</TableCell>
                <TableCell>{_('${qty} sold', { qty: String(p.soldQty) })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
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
