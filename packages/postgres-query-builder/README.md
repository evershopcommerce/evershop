# MySQL query builder for Node

[![Build](https://github.com/kt65/postgres-query-builder/actions/workflows/build.yml/badge.svg)](https://github.com/kt65/postgres-query-builder/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/%40evershop%2Fpostgres-query-builder.svg)](https://badge.fury.io/js/%40evershop%2Fpostgres-query-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A MySQL query builder for NodeJS. 

## Installation

```javascript
npm install @evershop/postgres-query-builder
```

## Usage guide
It implements async/await.
### Simple select
```javascript
// var mysql = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'me',
//   password : 'secret',
//   database : 'my_db'
// });

// connection.connect();
// connection.query('SELECT * FROM product WHERE product_id > ?', [1], function (error, results, fields) {
//   if (error) throw error;
//    console.log('The solution is: ', results[0].solution);
// });
```
```javascript
const {select} = require('@evershop/postgres-query-builder')

const products = await select("*")
.from("product")
.where("product_id", ">", 1)
.execute(pool);
```
### More complex where
```javascript
// var mysql = require('mysql');
// var mysql = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'me',
//   password : 'secret',
//   database : 'my_db'
// });

// connection.query('SELECT * FROM product WHERE product_id > ? AND sku LIKE ?', [1, "sku"], function (error, results, fields) {
//   if (error) throw error;
//    console.log('The solution is: ', results[0].solution);
// });
```
```javascript
const {select} = require('@evershop/postgres-query-builder')

const products = await select("*")
.from("product")
.where("product_id", ">", 1)
.and("sku", "LIKE", "sku")
.execute(pool);
```
### Event more complex where
```javascript
// var mysql = require('mysql');
// var mysql = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'me',
//   password : 'secret',
//   database : 'my_db'
// });

// connection.query('SELECT * FROM product WHERE (product_id > ? AND sku LIKE ?) OR price > ?', [1, "sku", 100], function (error, results, fields) {
//   if (error) throw error;
//    console.log('The solution is: ', results[0].solution);
// });
```
```javascript
const {select} = require('@evershop/postgres-query-builder')

const query = select("*").from("product");
query.where("product_id", ">", 1).and("sku", "LIKE", "sku");
query.orWhere("price", ">", 100);

const products = await query.execute(pool);
```

### Join table
```javascript
// var mysql = require('mysql');
// var mysql = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'me',
//   password : 'secret',
//   database : 'my_db'
// });

// connection.query('SELECT * FROM product LEFT JOIN price ON product.id = price.id WHERE (product_id > ? AND sku LIKE ?) OR price > ?', [1, "sku", 100], function (error, results, fields) {
//   if (error) throw error;
//    console.log('The solution is: ', results[0].solution);
// });
```
```javascript
const {select} = require('@evershop/postgres-query-builder')

const query = select("*").from("product");
query.leftJoin('price').on('product.`product_id`', '=', 'price.`product_id`');
query.where("product_id", ">", 1).and("sku", "LIKE", "sku");
query.andWhere("price", ">", 100);

const products = await query.execute(pool);
```

### Insert&update
<table>
<tr>
<th> user_id </th>
<th> name </th>
<th> email </th>
<th> phone </th>
<th> status </th>
</tr>
<tr>
<td>
  1
</td>
<td>
  David
</td>
<td>
  emai@email.com
</td>
<td>
  123456
</td>
<td>
  1
</td>
</tr>
</table>

```javascript
// var mysql = require('mysql');
// var mysql = require('mysql');
// var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'me',
//   password : 'secret',
//   database : 'my_db'
// });

//  connection.query('INSERT INTO user SET name=?, email=?, phone=?, status=?', ["David", "email@email.com", "123456", 1], function (error, results, fields) {
//    if (error) {
//      return connection.rollback(function() {
//        throw error;
//      });
//    }
//  });
```
```javascript
const {insert} = require('@evershop/postgres-query-builder')

const query = insert("user")
.given({name: "David", email: "email@email.com", "phone": "123456", status: 1, notExistedColumn: "This will not be a part of the query"});
await query.execute(pool);
```
```javascript
const {update} = require('@evershop/postgres-query-builder')

const query = update("user")
.given({name: "David", email: "email@email.com", "phone": "123456", status: 1, notExistedColumn: "This will not be a part of query"})
.where("user_id", "=", 1);
await query.execute(pool);
```
### Working with transaction

```javascript
const {insert, getConnection, startTransaction, commit, rollback} = require('@evershop/postgres-query-builder');

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "test",
    dateStrings: true
});

// Create a connection from the pool
const connection = await getConnection(pool);

// Start a transaction
await startTransaction(connection);
try {
  await insert("user")
        .given({name: "David", email: "email@email.com", "phone": "123456", status: 1, notExistedColumn: "This will not be a part of the query"})
        .execute(connection);
  await commit(connection);
} catch(e) {
  await rollback(connection);
}
```
## Security

All user provided data will be escaped. Please check [this](https://github.com/mysqljs/mysql#escaping-query-values) for more detail. 