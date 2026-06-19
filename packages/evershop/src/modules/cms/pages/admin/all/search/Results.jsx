import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@components/common/ui/Tabs.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import PropTypes from 'prop-types';
import React from 'react';

export function Results({ keyword, results = {} }) {
  const { customers = [], products = [], orders = [] } = results;

  // Determine which tabs have data
  const availableTabs = [];
  if (products.items.length > 0) availableTabs.push('products');
  if (customers.items.length > 0) availableTabs.push('customers');
  if (orders.items.length > 0) availableTabs.push('orders');

  // Default to first available tab
  const defaultTab = availableTabs[0] || 'products';

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">
        {_('Results for "${keyword}"', { keyword })}
      </h3>
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line">
          {products.items.length > 0 && (
            <TabsTrigger value="products">
              {_('Products (${count})', { count: products.items.length })}
            </TabsTrigger>
          )}
          {customers.items.length > 0 && (
            <TabsTrigger value="customers">
              {_('Customers (${count})', { count: customers.items.length })}
            </TabsTrigger>
          )}
          {orders.items.length > 0 && (
            <TabsTrigger value="orders">
              {_('Orders (${count})', { count: orders.items.length })}
            </TabsTrigger>
          )}
        </TabsList>

        {products.items.length > 0 && (
          <TabsContent value="products" className="max-h-60 overflow-y-auto">
            <div className="flex flex-col space-y-1">
              {products.items.map((product, index) => (
                <a
                  href={product.url}
                  key={index}
                  className="rounded py-2 px-2 hover:bg-muted block"
                >
                  <div className="font-bold">{product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    #{product.sku}
                  </div>
                </a>
              ))}
            </div>
          </TabsContent>
        )}

        {customers.items.length > 0 && (
          <TabsContent value="customers" className="max-h-60 overflow-y-auto">
            <div className="flex flex-col space-y-1">
              {customers.items.map((customer, index) => (
                <a
                  href={customer.url}
                  key={index}
                  className="rounded py-2 px-2 hover:bg-muted block"
                >
                  <div className="font-bold">{customer.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.email}
                  </div>
                </a>
              ))}
            </div>
          </TabsContent>
        )}

        {orders.items.length > 0 && (
          <TabsContent value="orders" className="max-h-60 overflow-y-auto">
            <div className="flex flex-col space-y-1">
              {orders.items.map((order, index) => (
                <a
                  href={order.url}
                  key={index}
                  className="rounded py-2 px-2 hover:bg-muted block"
                >
                  <div className="font-bold">#{order.orderNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {order.email}
                  </div>
                </a>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

Results.propTypes = {
  keyword: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          name: PropTypes.string,
          description: PropTypes.string
        })
      )
    })
  )
};

Results.defaultProps = {
  keyword: undefined,
  results: []
};
