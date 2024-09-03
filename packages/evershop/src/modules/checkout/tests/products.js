const products = [
  {
    product_id: 1,
    name: 'Product 1',
    sku: 'SKU1',
    price: 100,
    status: true,
    qty: 100,
    tax_class: 1
  },
  {
    product_id: 2,
    name: 'Product 2',
    sku: 'SKU2',
    price: 200,
    status: true,
    qty: 100,
    tax_class: 1
  },
  {
    product_id: 3,
    name: 'Product 3',
    sku: 'SKU3',
    price: 300,
    status: true,
    qty: 100,
    tax_class: 1
  },
  {
    product_id: 4,
    name: 'No Tax',
    sku: 'SKU4',
    price: 300,
    status: true,
    qty: 100,
    tax_class: null
  },
  {
    product_id: 5,
    name: 'Tax Exempt',
    sku: 'SKU5',
    price: 123.45,
    status: true,
    qty: 100,
    tax_class: 3
  },
  {
    product_id: 6,
    name: 'Long decimal tax',
    sku: 'SKU6',
    price: 345.73,
    status: true,
    qty: 100,
    tax_class: 4
  },
  {
    product_id: 7,
    name: 'Tax 10%',
    sku: 'SKU7',
    price: 819,
    status: true,
    qty: 100,
    tax_class: 1
  }
];

module.exports.products = products;
