/* eslint-disable */
const uniqid = require('uniqid');
const { toString } = require('./toString');
const { fieldResolve } = require('./fieldResolve');
const { isValueASQL } = require('./isValueASQL');

class Select {
  constructor() {
    this._fields = [];
  }

  select(field, alias) {
    // Resolve field name
    let f = '';
    if (isValueASQL(field) || field === '*') {
      f += `${field}`;
    } else {
      f += `"${field}"`;
    }
    if (alias) {
      f += ` AS "${alias}"`;
    }

    this._fields.push(f);
    return this;
  }

  render() {
    var stm = 'SELECT ';
    if (this._fields.length === 0) {
      stm = stm + '*  ';
    } else {
      this._fields.forEach((element) => {
        stm += `${element}, `;
      });
    }
    return stm.slice(0, -2);
  }

  clone() {
    let cp = new select();
    cp._fields = this._fields;
    return cp;
  }
}

class RawLeaf {
  constructor(link, rawSql, binding = {}) {
    this._link = link;
    this._binding = binding;
    this._rawSql = rawSql;
  }

  getBinding() {
    return this._binding;
  }

  parent() {
    return this._parent;
  }

  render() {
    return `${this._link} ${this._rawSql}`;
  }

  clone(node) {
    let cp = new RawLeaf(this._link, this._rawSql, this._binding);
    cp._parent = node;
    return cp;
  }
}

class Leaf {
  constructor(link, field, operator, value, node) {
    this._binding = [];
    if (value.isSQL === true) {
      this._value = value.value;
    } else {
      value = value.value;
      if (
        operator.toUpperCase() === 'IN' ||
        operator.toUpperCase() === 'NOT IN'
      ) {
        if (Array.isArray(value) && value.length > 0) {
          this._value = '(';
          value.forEach((element) => {
            const key = uniqid();
            this._value = this._value + `:${key}, `;
            this._binding[key] = element;
          });
          this._value = this._value.slice(0, -2) + ')';
        } else if (Array.isArray(value) && value.length === 0) {
          if (operator.toUpperCase() === 'IN') {
            this._value = '(SELECT 1 WHERE 1=0)';
          } else {
            this._value = '(SELECT 1 WHERE 1=1)';
          }
        } else {
          throw new Error(`Expect an array, got ${typeof value}`);
        }
      } else if (
        operator.toUpperCase() === 'IS NULL' ||
        operator.toUpperCase() === 'IS NOT NULL'
      ) {
        this._value = '';
      } else {
        const key = uniqid();
        this._binding[key] = toString(value);
        this._value = `:${key}`;
      }
    }
    this._link = link;
    this._field = fieldResolve(field);
    this._operator = operator.toUpperCase();
    this._parent = node;
  }

  getBinding() {
    return this._binding;
  }

  parent() {
    return this._parent;
  }

  render() {
    return `${this._link} ${this._field} ${this._operator} ${this._value}`;
  }

  clone(node) {
    let cp = new Leaf('AND', 'dummy', '=', 'dummy'); // This is really dirty
    cp._binding = this._binding;
    cp._field = this._field;
    cp._link = this._link;
    cp._operator = this._operator;
    cp._value = this._value;
    cp._parent = node;
    return cp;
  }
}

class Node {
  constructor(query, defaultValueTreatment = 'value') {
    this._defaultValueTreatment = defaultValueTreatment;
    this._tree = [];
    this._link = undefined;
    this._parent = undefined;
    this._query = query;
  }

  addLeaf(link, field, operator, value) {
    // check if value is an object, not null and not an array
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      this._tree.push(new Leaf(link, field, operator, value, this));
    } else {
      this._tree.push(
        new Leaf(
          link,
          field,
          operator,
          { value: value, isSQL: this._defaultValueTreatment === 'sql' },
          this
        )
      );
    }

    // Return this for chaining
    return this;
  }

  addRaw(link, sql, binding = {}) {
    this._tree.push(new RawLeaf(link, sql, binding));
    return this;
  }

  addNode(node) {
    node._parent = this;
    this._tree.push(node);
    return node;
  }

  /**
   * This method will empty the tree
   */
  empty() {
    this._tree = [];
    return this;
  }

  getLeafs() {
    return this._tree.filter(
      (e) => e.constructor.name === 'Leaf' || e.constructor.name === 'RawLeaf'
    );
  }

  getNodes() {
    return this._tree.filter((e) => e.constructor.name === 'Node');
  }

  isEmpty() {
    return !this.getLeafs().length > 0 && !this.getNodes().length > 0;
  }

  findLeaf(link, field, operator, value) {
    this._tree.forEach((element) => {
      if (
        element.constructor.name === 'Leaf' &&
        element._link === link &&
        element._field === fieldResolve(field) &&
        element._binding[field] === value
      ) {
        return element;
      } else {
        return element.findLeaf(link, field, operator, value);
      }
    });
  }

  getBinding() {
    let binding = {};
    this._tree.forEach((element) => {
      Object.assign(binding, element.getBinding());
    });

    return binding;
  }

  and(field, operator, value) {
    this.addLeaf('AND', field, operator, value, this);
    return this;
  }

  or(field, operator, value) {
    this.addLeaf('OR', field, operator, value, this);
    return this;
  }

  render() {
    if (this._tree.length === 0) {
      return '';
    }
    let statement = `${this._link} (`;
    this._tree.forEach((element, index) => {
      if (index === 0) {
        statement += ` ${element.render()}`.slice(this._link === 'AND' ? 5 : 4);
      } else {
        statement += ` ${element.render()}`;
      }
    });
    statement += ')';
    return statement;
  }

  // a "proxy" function to Query execute method
  async execute(connection, releaseConnection = true) {
    return await this._query.execute(connection, releaseConnection);
  }

  // a "proxy" function to Query load method
  async load(connection, releaseConnection = true) {
    return await this._query.load(connection, releaseConnection);
  }

  clone(query, parent) {
    let cp = new Node(query);
    cp._link = this._link;
    cp._parent = parent;
    cp._tree = this._tree.map((t) => {
      if (t.constructor === Leaf || t.constructor === RawLeaf) {
        return t.clone(cp);
      } else {
        return t.clone(query, cp);
      }
    });
    return cp;
  }
}

class Join {
  constructor(query) {
    this._joins = [];
    this._query = query;
  }

  add(type, table, alias) {
    this._joins.push({
      type,
      table,
      alias: alias || table,
      on: new Node(this._query, 'sql')
    });

    return this;
  }

  on(column, operator, referencedColumn) {
    if (this._joins.length === 0) {
      throw new Error('Invalid call');
    }

    let node = this._joins[this._joins.length - 1]['on'];
    node._link = 'ON';
    node.addLeaf('AND', column, operator, referencedColumn, node);
    return node;
  }

  render() {
    if (this._joins.length === 0) {
      return '';
    }

    let stm = '';
    this._joins.forEach((join) => {
      stm += `${join.type} "${join.table}" AS "${
        join.alias
      }" ${join.on.render()} `;
      Object.assign(this._query._binding, join.on.getBinding());
    });
    return stm;
  }

  clone(query) {
    let cp = new Join(query);
    cp._joins = this._joins;
    return cp;
  }
}

class Where extends Node {
  constructor(query) {
    super(query);
  }

  render() {
    Object.assign(this._query._binding, this.getBinding());
    let render = super.render();
    if (render === '') {
      return '';
    } else {
      return 'WHERE ' + render.slice(4);
    }
  }

  andWhere(field, operator, value) {
    let node = new Node(this._query);
    node._link = 'AND';
    node._parent = this;
    node.addLeaf('AND', field, operator, value, this);
    this.addNode(node);
    return node;
  }

  orWhere(field, operator, value) {
    let node = new Node(this._query);
    node._link = 'OR';
    node._parent = this;
    node.addLeaf('OR', field, operator, value, this);
    this.addNode(node);
    return node;
  }

  clone(query) {
    let cp = new Where(query);
    cp._link = this._link;
    cp._tree = this._tree.map((t) => {
      if (t.constructor === Leaf) {
        return t.clone(cp);
      } else {
        return t.clone(query, cp);
      }
    });
    return cp;
  }
}

class Having extends Node {
  constructor(query) {
    super();
    this._query = query;
    this._link = 'HAVING';
  }

  render() {
    Object.assign(this._query._binding, this.getBinding());
    return super.render();
  }

  clone(query) {
    let cp = new this.constructor(query);
    cp._tree = this._tree.map((t) => {
      if (t.constructor === Leaf) {
        return t.clone(cp);
      } else {
        return t.clone(query, cp);
      }
    });
    return cp;
  }
}

class Limit {
  constructor(offset = null, limit = null) {
    this._offset = offset;
    this._limit = limit;
  }

  render() {
    if ((this._offset === this._limit) === null) {
      return '';
    }
    return `LIMIT ${this._limit === null ? null : this._limit} OFFSET ${
      +this._offset || 0
    } `;
  }

  clone() {
    return new this.constructor(this._offset, this._limit);
  }
}

class GroupBy {
  constructor() {
    this._fields = [];
  }

  add(field) {
    this._fields.push(fieldResolve(field));
    return this;
  }

  render() {
    if (this._fields.length === 0) {
      return '';
    }
    return `GROUP BY ${this._fields.join(',')}`;
  }

  clone() {
    let cp = new GroupBy();
    cp._fields = [...this._fields];
    return cp;
  }
}

class OrderBy {
  constructor() {
    this._field = null;
    this._direction = 'DESC';
  }

  add(field, direction) {
    this._field = fieldResolve(field);
    this._direction = direction == null ? 'DESC' : direction;
    return this;
  }

  render() {
    if (this._field === null) {
      return '';
    }
    return `ORDER BY ${this._field} ${this._direction}`;
  }

  clone() {
    let cp = new this.constructor();
    cp._field = this._field;
    cp._direction = this._direction;
    return cp;
  }
}

class Query {
  constructor() {
    this._where = new Where(this);
    this._where._link = 'AND';
    this._binding = [];
  }

  /**
   * @returns {Where|Node}
   */
  where(field, operator, value) {
    // This method will reset the `_where` object. Call `andWhere` or `orWhere` if you want to add more condition
    this._where = new Where(this);
    this._where._link = 'AND';
    this._where.addLeaf('AND', field, operator, value, this._where);
    return this._where;
  }

  andWhere(field, operator, value) {
    if (this._where.isEmpty() === true) {
      return this.where(field, operator, value);
    }
    return this._where.andWhere(field, operator, value);
  }

  orWhere(field, operator, value) {
    if (this._where.isEmpty() === true) {
      return this.where(field, operator, value);
    }
    return this._where.orWhere(field, operator, value);
  }

  getWhere() {
    return this._where;
  }

  getBinding() {
    return this._binding;
  }

  async execute(connection, releaseConnection = true) {
    let sql = await this.sql(connection);
    let binding = [];
    let id = 0;
    for (let key in this._binding) {
      id += 1;
      if (this._binding.hasOwnProperty(key)) {
        sql = sql.replace(`:${key}`, `$${id}`);
        binding.push(this._binding[key]);
      }
    }
    let { rows } = await connection.query({
      text: sql,
      values: binding
    });
    if (releaseConnection) {
      release(connection);
    }
    return rows;
  }
}

class SelectQuery extends Query {
  constructor() {
    super();
    this._table = undefined;
    this._alias = undefined;
    this._select = new Select();
    this._having = new Having(this);
    this._join = new Join(this);
    this._limit = new Limit();
    this._groupBy = new GroupBy();
    this._orderBy = new OrderBy();
  }

  select(field, alias) {
    this._select.select(field, alias);
    return this;
  }

  from(table, alias) {
    this._table = table;
    this._alias = alias;
    return this;
  }

  having(field, operator, value) {
    this._having.and(field, operator, value);
    return this._having;
  }

  leftJoin(table, alias) {
    this._join.add('LEFT JOIN', table, alias);
    return this._join;
  }

  rightJoin(table, alias) {
    this._join.add('RIGHT JOIN', table, alias);
    return this._join;
  }

  innerJoin(table, alias) {
    this._join.add('INNER JOIN', table, alias);
    return this._join;
  }

  limit(offset, limit) {
    this._limit = new Limit(offset, limit);
    return this;
  }

  groupBy() {
    let args = [].slice.call(arguments);
    args.forEach((element) => {
      this._groupBy.add(String(element));
    });
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this._orderBy.add(field, direction);
    return this;
  }

  sql() {
    if (!this._table) {
      throw Error('You must specific table by calling `from` method');
    }
    let from = `"${this._table}"`;
    if (this._alias) {
      from += ` AS "${this._alias}"`;
    }
    return [
      this._select.render().trim(),
      'FROM',
      from.trim(),
      this._join.render().trim(),
      this._where.render().trim(),
      this._groupBy.render().trim(),
      this._having.render().trim(),
      this._orderBy.render().trim(),
      this._limit.render().trim()
    ]
      .filter((e) => e !== '')
      .join(' ');
  }

  async load(connection, releaseConnection = true) {
    this.limit(0, 1);
    let rows = await this.execute(connection, releaseConnection);
    return rows[0] || null;
  }

  async execute(connection, releaseConnection = true) {
    if (connection.constructor.name === 'BoundPool') {
      connection = await getConnection(connection);
    }
    let sql = await this.sql(connection);
    let binding = [];
    let i = 0;
    for (var key in this._binding) {
      i += 1;
      if (this._binding.hasOwnProperty(key)) {
        sql = sql.replace(`:${key}`, `$${i}`);
        binding.push(this._binding[key]);
      }
    }
    try {
      let { rows } = await connection.query({ text: sql, values: binding });
      return rows;
    } catch (e) {
      if (e.code === '42703') {
        this.removeOrderBy();
        return await super.execute(connection, false);
      } else if (e.code.toLowerCase() === '22p02') {
        // In case of invalid input type, we consider it as empty result
        return [];
      } else {
        throw e;
      }
    } finally {
      if (releaseConnection) {
        release(connection);
      }
    }
  }

  clone() {
    let cp = new SelectQuery();
    cp._table = this._table;
    cp._alias = this._alias;
    cp._where = this._where.clone(cp);
    cp._having = this._having.clone(cp);
    cp._join = this._join.clone(cp);
    cp._limit = this._limit.clone();
    cp._groupBy = this._groupBy.clone();
    cp._orderBy = this._orderBy.clone();
    return cp;
  }

  removeOrderBy() {
    this._orderBy = new OrderBy();
    return this;
  }

  removeGroupBy() {
    this._groupBy = new GroupBy();
    return this;
  }
}

class UpdateQuery extends Query {
  constructor(table) {
    // Private
    super();
    this._table = table;
    this._primaryColumn = null;
    this._data = {};
  }

  given(data) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Data must be an object and not null');
    }
    let copy = {};
    Object.keys(data).forEach((key) => {
      copy[key] = toString(data[key]);
    });
    this._data = copy;
    return this;
  }

  prime(field, value) {
    this._data[field] = toString(value);
    return this;
  }

  async sql(connection) {
    if (!this._table) {
      throw Error('You need to call specific method first');
    }
    if (Object.keys(this._data).length === 0) {
      throw Error('You need provide data first');
    }

    let { rows } = await connection.query(
      `SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default, 
        is_identity, 
        identity_generation 
      FROM information_schema.columns 
      WHERE table_name = '${this._table}'`
    );
    let set = [];
    rows.forEach((field) => {
      if (['BY DEFAULT', 'ALWAYS'].includes(field['identity_generation'])) {
        this._primaryColumn = field['column_name'];
        return;
      }
      if (this._data[field['column_name']] === undefined) {
        return;
      }
      let key = uniqid();
      set.push(`"${field['column_name']}" = :${key}`);
      this._binding[key] = this._data[field['column_name']];
    });

    if (set.length === 0) {
      throw new Error('No data was provided' + this._table);
    }

    var sql = [
      'UPDATE',
      `"${this._table}"`,
      'SET',
      set.join(', '),
      this._where.render(),
      'RETURNING *'
    ]
      .filter((e) => e !== '')
      .join(' ');
    return sql;
  }

  async execute(connection, releaseConnection = true) {
    const rows = await super.execute(connection, releaseConnection);
    const updatedRow = rows[0];
    if (this._primaryColumn) {
      updatedRow['updatedId'] = updatedRow[this._primaryColumn];
    }
    return updatedRow;
  }
}

class InsertQuery extends Query {
  constructor(table) {
    // Private
    super();
    this._table = table;
    this._primaryColumn = null;
    this._data = {};
  }

  given(data) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Data must be an object and not null');
    }
    let copy = {};
    Object.keys(data).forEach((key) => {
      copy[key] = toString(data[key]);
    });
    this._data = copy;

    return this;
  }

  prime(field, value) {
    this._data[field] = toString(value);

    return this;
  }

  async sql(connection) {
    if (!this._table) {
      throw Error('You need to call specific method first');
    }

    if (Object.keys(this._data).length === 0) {
      throw Error('You need provide data first');
    }

    let { rows } = await connection.query(
      `SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default, 
        is_identity, 
        identity_generation 
      FROM information_schema.columns 
      WHERE table_name = '${this._table}'`
    );
    let fs = [],
      vs = [];
    rows.forEach((field) => {
      if (['BY DEFAULT', 'ALWAYS'].includes(field['identity_generation'])) {
        this._primaryColumn = field['column_name'];
        return;
      }
      if (this._data[field['column_name']] === undefined) {
        return;
      }
      let key = uniqid();
      fs.push(`"${field['column_name']}"`);
      vs.push(`:${key}`);
      this._binding[key] = this._data[field['column_name']];
    });

    let sql = [
      'INSERT INTO',
      `"${this._table}"`,
      '(',
      fs.join(', '),
      ')',
      'VALUES',
      '(',
      vs.join(', '),
      ')',
      'RETURNING *'
    ]
      .filter((e) => e !== '')
      .join(' ');
    return sql;
  }

  async execute(connection, releaseConnection = true) {
    const rows = await super.execute(connection, releaseConnection);
    const insertedRow = rows[0];
    if (this._primaryColumn) {
      insertedRow['insertId'] = insertedRow[this._primaryColumn];
    }
    return insertedRow;
  }
}

class InsertOnUpdateQuery extends Query {
  constructor(table, conflictColumns) {
    // Private
    super();
    this._table = table;
    this._data = [];
    this._conflictColumns = conflictColumns;
  }

  given(data) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Data must be an object and not null');
    }
    let copy = {};
    Object.keys(data).forEach((key) => {
      copy[key] = toString(data[key]);
    });
    this._data = copy;
    return this;
  }

  prime(field, value) {
    this._data[field] = toString(value);
    return this;
  }

  async sql(connection) {
    if (!this._table) {
      throw Error('You need to call specific method first');
    }

    if (Object.keys(this._data).length === 0) {
      throw Error('You need provide data first');
    }

    let { rows } = await connection.query({
      text: `SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable, 
        column_default, 
        is_identity, 
        identity_generation 
      FROM information_schema.columns 
      WHERE table_name = $1`,
      values: [this._table]
    });

    let fs = [],
      vs = [],
      us = [],
      usp = [];
    rows.forEach((field) => {
      if (['BY DEFAULT', 'ALWAYS'].includes(field['identity_generation'])) {
        return;
      }
      if (this._data[field['column_name']] === undefined) {
        return;
      }
      let key = uniqid();
      let ukey = uniqid();
      fs.push(`"${field['column_name']}"`);
      vs.push(`:${key}`);
      us.push(`"${field['column_name']}" = :${ukey}`);
      usp[ukey] = this._data[field['column_name']];
      this._binding[key] = this._data[field['column_name']];
    });

    this._binding = { ...this._binding, ...usp };

    let sql = [
      'INSERT INTO',
      `"${this._table}"`,
      '(',
      fs.join(', '),
      ')',
      'VALUES',
      '(',
      vs.join(', '),
      ')',
      `ON CONFLICT (${this._conflictColumns.join(',')}) DO UPDATE SET`,
      us.join(', '),
      'RETURNING *'
    ]
      .filter((e) => e !== '')
      .join(' ');
    return sql;
  }

  async execute(connection, releaseConnection = true) {
    const rows = await super.execute(connection, releaseConnection);
    const insertedRow = rows[0];
    if (this._primaryColumn) {
      insertedRow['insertId'] = insertedRow[this._primaryColumn];
    }
    return insertedRow;
  }
}

class DeleteQuery extends Query {
  constructor(table) {
    // Private
    super();
    this._table = table;
  }

  sql() {
    if (!this._table) {
      throw Error('You need to call specific method first');
    }
    return [
      'DELETE FROM',
      `"${this._table}"`,
      this._where.render().trim()
    ].join(' ');
  }
}

module.exports = {
  select,
  insert,
  update,
  node,
  del,
  insertOnUpdate,
  getConnection,
  startTransaction,
  commit,
  rollback,
  release,
  execute,
  sql,
  value
};

function select() {
  let select = new SelectQuery();
  let args = [...arguments];
  if (args[0] === '*') {
    select.select('*');
    return select;
  }
  args.forEach((arg) => {
    if (typeof arg == 'string') select.select(arg);
  });
  return select;
}

function insert(table) {
  return new InsertQuery(table);
}

function insertOnUpdate(table, conflictColumns) {
  // Check if conflictColumns is an array and not empty
  if (!Array.isArray(conflictColumns) || conflictColumns.length === 0) {
    throw new Error('conflictColumns must be an array and not empty');
  }
  return new InsertOnUpdateQuery(table, conflictColumns);
}

function update(table) {
  return new UpdateQuery(table);
}

function del(table) {
  return new DeleteQuery(table);
}

function node(link) {
  let node = new Node();
  node._link = link;

  return node;
}

/* Create a connection from a pool */
async function getConnection(pool) {
  return await pool.connect();
}

async function startTransaction(connection) {
  await connection.query('BEGIN');
  connection.INTRANSACTION = true;
  connection.COMMITTED = false;
}

async function commit(connection) {
  await connection.query('COMMIT');
  connection.INTRANSACTION = false;
  connection.COMMITTED = true;
  release(connection);
}

async function rollback(connection) {
  await connection.query('ROLLBACK');
  connection.INTRANSACTION = false;
  connection.release();
}

function release(connection) {
  if (connection.INTRANSACTION === true) {
    return;
  }
  // Check if connection is instance of BoundPool class
  if (connection.constructor.name === 'BoundPool') {
    return;
  }
  connection.release();
}

async function execute(connection, query) {
  return await connection.query(query);
}

function sql(value) {
  return {
    value: value,
    isSQL: true
  };
}

function value(val) {
  return {
    value: val,
    isSQL: false
  };
}
