# PostgreSQL query builder for Node

A PostgreSQL query builder for NodeJS.

## Installation

```javascript
npm install @evershop/postgres-query-builder
```

## Usage guide

It implements async/await.

### Simple select

```javascript
const { select } = require('@evershop/postgres-query-builder');

const products = await select('*')
  .from('product')
  .where('product_id', '>', 1)
  .execute(pool);
```

### More complex where

```javascript
const { select } = require('@evershop/postgres-query-builder');

const products = await select('*')
  .from('product')
  .where('product_id', '>', 1)
  .and('sku', 'LIKE', 'sku')
  .execute(pool);
```

### Event more complex where

```javascript
const { select } = require('@evershop/postgres-query-builder');

const query = select('*').from('product');
query.where('product_id', '>', 1).and('sku', 'LIKE', 'sku');
query.orWhere('price', '>', 100);

const products = await query.execute(pool);
```

### Join table

```javascript
const { select } = require('@evershop/postgres-query-builder');

const query = select('*').from('product');
query.leftJoin('price').on('product.`product_id`', '=', 'price.`product_id`');
query.where('product_id', '>', 1).and('sku', 'LIKE', 'sku');
query.andWhere('price', '>', 100);

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

````javascript
```javascript
const {insert} = require('@evershop/postgres-query-builder')

const query = insert("user")
.given({name: "David", email: "email@email.com", "phone": "123456", status: 1, notExistedColumn: "This will not be a part of the query"});
await query.execute(pool);
````

```javascript
const { update } = require('@evershop/postgres-query-builder');

const query = update('user')
  .given({
    name: 'David',
    email: 'email@email.com',
    phone: '123456',
    status: 1,
    notExistedColumn: 'This will not be a part of query'
  })
  .where('user_id', '=', 1);
await query.execute(pool);
```

### Working with transaction

```javascript
const { Pool } = require('pg');
const {
  insert,
  getConnection,
  startTransaction,
  commit,
  rollback
} = require('@evershop/postgres-query-builder');

const pool = new Pool(connectionSetting);

// Create a connection from the pool
const connection = await getConnection(pool);

// Start a transaction
await startTransaction(connection);
try {
  await insert('user')
    .given({
      name: 'David',
      email: 'email@email.com',
      phone: '123456',
      status: 1,
      notExistedColumn: 'This will not be a part of the query'
    })
    .execute(connection);
  await commit(connection);
} catch (e) {
  await rollback(connection);
}
```

## Security

All user provided data will be escaped.
