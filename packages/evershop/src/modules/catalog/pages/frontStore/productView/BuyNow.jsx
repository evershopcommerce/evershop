import Button from '@components/common/form/Button';
import React from 'react';
import { toast } from 'react-toastify';

export default function BuyNow({areaProps: {product}, action}) {
  const [adding, setAdding] = React.useState(false);
  return <Button
  className="bg-primary text-white"
  title="Add Now"
  onAction={async () => {
    setAdding(true);
    // use fetch to call the action api with the product id and quantity 1
    // then show a toast message
    const response = await fetch(action, {
      method: 'POST',
      body: JSON.stringify({
        sku: product.sku,
        qty: 1
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const json = await response.json();
    if(json.error) {
      toast.error(json.error.message);
    } else {
      toast.success('Added to cart');
    }
    setAdding(false);
  }}
  isLoading={adding}
  />
}

export const layout = {
  areaId: "productListingItem",
  sortOrder: 100
}

// export const query = `
//   query Query {
//     action:url (routeId: "addMineCartItem")
//   }
// `;