const mysql = require("mysql2/promise");
const { Pool } = require("pg");

// MySQL database configuration
const mysqlConfig = {
  host: "localhost",
  user: "root",
  password: "123456",
  database: "evershop",
};

// PostgreSQL database configuration
const pgConfig = {
  host: "localhost",
  user: "postgres",
  password: "123456",
  database: "evershop",
  port: 5432,
};

// List of tables to copy
const tables = [
  "admin_user",
  "attribute",
  "attribute_group",
  "attribute_group_link",
  "attribute_option",
  "cart",
  "cart_address",
  "cart_item",
  "category",
  "category_description",
  "cms_page",
  "cms_page_description",
  "coupon",
  "customer",
  "customer_address",
  "customer_group",
  "order",
  "order_activity",
  "order_address",
  "order_item",
  "payment_transaction",
  "product",
  "product_attribute_value_index",
  "product_category",
  "product_custom_option",
  "product_custom_option_value",
  "product_description",
  "product_image",
  "setting",
  "shipment",
  "user_token_secret",
  "variant_group",
];

async function copyData(mysqlConn, pgClient, table) {
  try {
    // Disabling foreign key constraints on PostgreSQL table
    const disableFKQuery = `ALTER TABLE "${table}" DISABLE TRIGGER ALL`;
    await pgClient.query(disableFKQuery);

    // Fetching data from MySQL table
    const mysqlQuery = `SELECT * FROM \`${table}\``;
    let [rows, fields] = await mysqlConn.execute(mysqlQuery);
    console.log(`Data fetched successfully for ${table}`, rows);
    // Checking if the table has data
    if (rows.length === 0) {
      console.log(`Table ${table} has no data`);
      return;
    }

    const outdatedColumns = ["uuid", "row_id", "attribute_six", "attribute_sevent",  "attribute_eight",  "attribute_nine",  "attribute_ten" ];

    // Inserting the data into the PostgreSQL database for each table
    const placeholders = new Array(
      Object.keys(rows[0]).filter((col) => !outdatedColumns.includes(col)).length
    )
      .fill("")
      .map((_, index) => `$${index + 1}`)
      .join(",");
    const pgQuery = `INSERT INTO "${table}" (${Object.keys(rows[0])
      .filter((col) => !outdatedColumns.includes(col))
      .join(",")}) OVERRIDING SYSTEM VALUE VALUES (${placeholders})`;
    // If the table is product_description, we need to make the url_key unique
    if (table === "product_description") {
      rows = rows.map((row) => {
        row.url_key = row.url_key + "-" + row.product_description_id;
        return row;
      });
    }
    // Loop through each row of data and insert it into PostgreSQL table
    for (const row of rows) {
      // Check if the row exists in the PostgreSQL table
      const check = await pgClient.query(
        `SELECT * FROM "${table}" WHERE ${Object.keys(row)[0]} = $1`,
        [row[Object.keys(row)[0]]]
      );
      if (check.rows.length > 0) {
        // Update the row if it exists

        const updateData = Object.assign({}, row);
        delete updateData[Object.keys(row)[0]];
        outdatedColumns.forEach((col) => delete updateData[col]);
        const updateQuery = `UPDATE "${table}" SET ${Object.keys(updateData)
          .map((col, index) => `${col} = $${index + 1}`)
          .join(",")} WHERE ${Object.keys(row)[0]} = ${
          row[Object.keys(row)[0]]
        }`;
        await pgClient.query(updateQuery, Object.values(updateData));
      } else {
        // Transforming the data into a PostgreSQL-compatible format
        const newRow = Object.assign({}, row);
        outdatedColumns.forEach((col) => delete newRow[col]);
        const data = Object.values(newRow);
        await pgClient.query(pgQuery, data);
      }
    }
    // Set the sequence value to the max value of the id column
    const maxId = await pgClient.query(
      `SELECT MAX(${Object.keys(rows[0])[0]}) FROM "${table}"`
    );

    // Get the sequence name
    const sequenceName = await pgClient.query(
      `SELECT pg_get_serial_sequence('${table}', '${Object.keys(rows[0])[0]}')`
    );
    // Set the sequence value
    await pgClient.query(
      `ALTER SEQUENCE ${
        sequenceName.rows[0].pg_get_serial_sequence
      } RESTART WITH ${maxId.rows[0].max + 1}`
    );

    // Re-enabling foreign key constraints on PostgreSQL table
    const enableFKQuery = `ALTER TABLE "${table}" ENABLE TRIGGER ALL`;
    await pgClient.query(enableFKQuery);
    console.log(`Data copied successfully for ${table}`);
  } catch (err) {
    // Rolling back the transaction if there is an error
    await pgClient.query("ROLLBACK");
    console.error(`Error copying data for ${table}: ${err.message}`);
    throw err;
  }
}

(async () => {
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  const postgresPool = new Pool(pgConfig);
  const client = await postgresPool.connect();

  try {
    // Start postgresql transaction
    await client.query("BEGIN");

    // Delete data form attributes table
    await client.query("DELETE FROM attribute");
    // Fetch data from mysql table
    for (const table of tables) {
      await copyData(mysqlConn, client, table);
    }
    // Committing the transaction on PostgreSQL database
    await client.query("COMMIT");
    process.exit(0);
  } catch (err) {
    // Rolling back the transaction if there is an error
    await client.query("ROLLBACK");
    process.exit(1);
  }
})();
