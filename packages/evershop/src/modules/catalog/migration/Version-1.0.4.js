const { execute, insert } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Create a function to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_inventory_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('inventory_updated', json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON "product_inventory"
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_inventory_updated_event();`
  );

  // Check if a default collection called "Featured Products" already exists
  const featuredProductsExists = await execute(
    connection,
    `SELECT EXISTS (SELECT 1 FROM collection WHERE code = 'homepage');`
  );

  if (featuredProductsExists.rows[0].exists) {
    return;
  }

  // Create a default collection called "Featured Products"
  const featuredProducts = await insert('collection')
    .given({
      name: 'Featured Products',
      code: 'homepage'
    })
    .execute(connection);

  // Create 4 default products and assign them to the "Featured Products" collection

  const product1 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'FMD-12345',
      price: 100,
      weight: 100,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product1.insertId,
      qty: 100,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description')
    .given({
      product_description_product_id: product1.insertId,
      name: 'Floral Maxi Dress',
      url_key: 'floral-maxi-dress',
      meta_title: 'Floral Maxi Dress',
      meta_description: 'Floral Maxi Dress',
      meta_keywords: 'Floral Maxi Dress',
      description:
        'Embrace the beauty of nature with our Floral Maxi Dress. This flowing dress features a stunning floral pattern that captures the essence of a blossoming garden. The lightweight fabric ensures comfort and breathability, making it perfect for both casual outings and special occasions. The dress is designed with a cinched waist and a v-neckline for a flattering silhouette. Elevate your style with this elegant and vibrant piece.'
    })
    .execute(connection);

  const product2 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'CLL-98765',
      price: 120,
      weight: 120,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product2.insertId,
      qty: 120,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description')
    .given({
      product_description_product_id: product2.insertId,
      name: 'Classic Leather Loafers',
      url_key: 'classic-leather-loafers',
      meta_title: 'Classic Leather Loafers',
      meta_description: 'Classic Leather Loafers',
      meta_keywords: 'Classic Leather Loafers',
      description:
        'Step into timeless elegance with our Classic Leather Loafers. Crafted from premium genuine leather, these loafers offer both style and comfort. The traditional design features a sleek and simple silhouette that pairs effortlessly with both formal and casual attire. The cushioned insole provides all-day support, making these loafers a versatile addition to your footwear collection.'
    })
    .execute(connection);

  const product3 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'DSJ-54321',
      price: 120,
      weight: 120,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product3.insertId,
      qty: 90,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description')
    .given({
      product_description_product_id: product3.insertId,
      name: 'Denim Skinny Jeans',
      url_key: 'denim-skinny-jeans',
      meta_title: 'Denim Skinny Jeans',
      meta_description: 'Denim Skinny Jeans',
      meta_keywords: 'Denim Skinny Jeans',
      description:
        'Experience the perfect blend of style and comfort with our Denim Skinny Jeans. These jeans are designed to hug your curves while allowing for ease of movement. The high-quality denim fabric offers durability and a flattering fit. The classic five-pocket design adds a touch of versatility, making these jeans a wardrobe staple for various occasions.'
    })
    .execute(connection);

  const product4 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'SCS-24680',
      price: 90,
      weight: 90,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product4.insertId,
      qty: 150,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description')
    .given({
      product_description_product_id: product4.insertId,
      name: 'Striped Cotton Sweater',
      url_key: 'striped-cotton-sweater',
      meta_title: 'Striped Cotton Sweater',
      meta_description: 'Striped Cotton Sweater',
      meta_keywords: 'Striped Cotton Sweater',
      description:
        "Stay cozy and chic with our Striped Cotton Sweater. This lightweight sweater features a timeless striped pattern that adds a pop of style to your outfit. The breathable cotton fabric makes it an excellent choice for layering during transitional seasons. The relaxed fit and ribbed cuffs ensure a comfortable and flattering look, whether you're lounging at home or going out for a casual day."
    })
    .execute(connection);

  // Assign products to the "Featured Products" collection
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product1.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product2.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product3.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product4.insertId
    })
    .execute(connection);
};
