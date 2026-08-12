import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

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
        <CardDescription>
          {_('A list of best selling products')}
        </CardDescription>
        <CardAction>
          <a href={listUrl} className="text-primary text-sm hover:underline">
            {_('View All Products')}
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/*
          `table-fixed` is load-bearing: with the default auto layout a long
          product name widens the table past the card and pushes the Price /
          Sold columns out of view entirely. Fixed layout pins the numeric
          columns and lets the name column absorb the remaining width, where
          `line-clamp-2` caps it at two lines.
        */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>{_('Product')}</TableHead>
              <TableHead className="w-28 text-right">{_('Price')}</TableHead>
              <TableHead className="w-16 text-right">{_('Sold')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestSellers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground py-6 text-center"
                >
                  {_('Look like you just started. No bestsellers yet.')}
                </TableCell>
              </TableRow>
            )}
            {bestSellers.map((p, i) => (
              <TableRow key={i}>
                {/* `whitespace-normal` overrides TableCell's default
                    `whitespace-nowrap`, without which the name cannot wrap and
                    `line-clamp-2` clips it to a single line mid-word. */}
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Fixed box so a missing or broken image keeps the row
                        the same height as its neighbours. */}
                    <div className="border-divider text-border flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border">
                      {p.image?.url ? (
                        <Image
                          src={p.image.url}
                          alt={p.name}
                          width={40}
                          height={40}
                        />
                      ) : (
                        <ProductNoThumbnail width={40} height={40} />
                      )}
                    </div>
                    <a
                      href={p.editUrl || ''}
                      title={p.name}
                      className="line-clamp-2 min-w-0 font-medium hover:underline"
                    >
                      {p.name}
                    </a>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.price.regular.text}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.soldQty}
                </TableCell>
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
