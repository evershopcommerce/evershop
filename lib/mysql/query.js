const uniqid = require('uniqid');
const util = require('util');

class Select {
    constructor() {
        this._fields = [];
    }

    select(field, alias) {
        // Resolve field name
        let f = "";
        if (
            /^[a-zA-Z_1-9]+([.])(`)[a-zA-Z0-9-_]+(`)$/.test(field) ||
            /^[a-zA-Z_1-9]+([.])([*])$/.test(field) ||
            /^[A-Z ]+([(])[a-zA-Z0-9 _=<>(,&).`]+([)])$/.test(field)
        )
            f += `${field}`;
        else
            f += `\`${field}\``;
        if (alias)
            f += ` AS ${alias}`;

        this._fields.push(f);

        return this;
    }

    render() {
        var stm = "SELECT ";
        if (this._fields.length === 0)
            stm = stm + "*  ";
        else
            this._fields.forEach(element => {
                stm += `${element}, `
            });

        return stm.slice(0, -2);
    }

    clone() {
        let cp = new select();
        cp._fields = this._fields;

        return cp;
    }
}

class Leaf {
    constructor(link, field, operator, value, node) {
        this._binding = [];
        // Check if the value is a column or not
        if (/^[`a-zA-Z_1-9]+([.])(`)[a-zA-Z0-9-_]+(`)$/.test(value))
            this._value = value;
        else {
            if (operator.toUpperCase() === "IN" || operator.toUpperCase() === "NOT IN") {
                if (Array.isArray(value) && value.length > 0) {
                    this._value = "(";
                    value.forEach(element => {
                        const key = uniqid();
                        this._value = this._value + `:${key}, `;
                        this._binding[key] = element;
                    });
                    this._value = this._value.slice(0, -2) + ")";
                } else {
                    throw new Error(`Expect an array, got ${typeof value}`);
                }
            } else {
                const key = uniqid();
                this._binding[key] = value;
                this._value = `:${key}`;
            }
        }
        this._link = link;
        this._field = field;
        this._operator = operator.toUpperCase();
        this._parent = node;
    }

    getBinding() {
        return this._binding
    }

    parent() {
        return this._parent;
    }

    render() {
        return `${this._link} ${this._field} ${this._operator} ${this._value}`
    }

    clone(node) {
        let cp = new Leaf("AND", "dummy", "=", "dummy");// This is really dirty
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
    constructor(query) {
        this._tree = [];
        this._link = undefined;
        this._parent = undefined;
        this._query = query;
    }

    addLeaf(link, field, operator, value) {
        this._tree.push(new Leaf(link, field, operator, value, this));

        // Return this for chaining
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
        return this._tree.filter((e) => e.constructor.name === "Leaf");
    }

    getNodes() {
        return this._tree.filter((e) => e.constructor.name === "Node");
    }

    isEmpty() {
        return !this.getLeafs().length > 0 && !this.getNodes().length > 0;
    }

    findLeaf(link, field, operator, value) {
        this._tree.forEach((element, index) => {
            if (
                element.constructor.name === "Leaf" &&
                element._link === link &&
                element._field === field &&
                element._binding[field] === value
            )
                return element;
            else
                return element.findLeaf(link, field, operator, value);
        });
    }

    getBinding() {
        let binding = {};
        this._tree.forEach((element, index) => {
            Object.assign(binding, element.getBinding());
        });

        return binding;
    }

    and(field, operator, value) {
        this.addLeaf("AND", field, operator, value, this);

        return this;
    }

    or(field, operator, value) {
        this.addLeaf("OR", field, operator, value, this);

        return this;
    }

    render() {
        if (this._tree.length === 0)
            return "";

        let statement = `${this._link} (`;
        this._tree.forEach((element, index) => {
            if (index === 0)
                statement += ` ${element.render()}`.slice(this._link === "AND" ? 5 : 4);
            else
                statement += ` ${element.render()}`;
        });

        statement += ")";

        return statement;
    }


    // a "proxy" function to Query execute method
    async execute(connection) {
        return await this._query.execute(connection);
    }

    // a "proxy" function to Query load method
    async load(connection) {
        return await this._query.load(connection);
    }

    clone(query, parent) {
        let cp = new Node(query);
        cp._link = this._link;
        cp._parent = parent;
        cp._tree = this._tree.map(t => {
            if (t.constructor === Leaf)
                return t.clone(cp)
            else
                return t.clone(query, cp);
        })

        return cp;
    }
}

class Join {
    constructor(query) {
        this._joins = [];
        this._query = query;
    }

    add(type, table, alias) {
        this._joins.push({ type, table, alias: alias || table, on: new Node(this._query) });

        return this;
    }

    on(column, operator, referencedColumn) {
        if (this._joins.length === 0)
            throw new Error("Invalid call");

        let node = this._joins[this._joins.length - 1]["on"];
        node._link = "ON";
        node.addLeaf("AND", column, operator, referencedColumn, node);

        return node;
    }

    render() {
        if (this._joins.length === 0)
            return "";

        let stm = "";
        this._joins.forEach(join => {
            stm += `${join.type} ${join.table} AS ${join.alias} ${join.on.render()} `;
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
        if (render === "")
            return "";
        else
            return "WHERE " + render.slice(4)
    }

    andWhere(field, operator, value) {
        let node = new Node(this._query);
        node._link = "AND";
        node._parent = this;
        node.addLeaf("AND", field, operator, value, this);
        this.addNode(node);

        return node;
    }

    orWhere(field, operator, value) {
        let node = new Node(this._query);
        node._link = "OR";
        node._parent = this;
        node.addLeaf("OR", field, operator, value, this);
        this.addNode(node);

        return node;
    }

    clone(query) {
        let cp = new Where(query);
        cp._link = this._link;
        cp._tree = this._tree.map(t => {
            if (t.constructor === Leaf)
                return t.clone(cp)
            else
                return t.clone(query, cp);
        })

        return cp;
    }
}

class Having extends Node {
    constructor(query) {
        super();
        this._query = query;
        this._link = "HAVING";
    }

    render() {
        Object.assign(this._query._binding, this.getBinding());
        return super.render();
    }

    clone(query) {
        let cp = new this.constructor(query);
        cp._tree = this._tree.map(t => {
            if (t.constructor === Leaf)
                return t.clone(cp)
            else
                return t.clone(query, cp);
        })

        return cp;
    }
}

class Limit {
    constructor(offset = null, limit = null) {
        this._offset = offset;
        this._limit = limit;
    }

    render() {
        if (this._offset === this._limit === null)
            return "";
        return `LIMIT ${+this._offset || 0}, ${this._limit === null ? 1000000000 : this._limit}`
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
        this._fields.push(field);

        return this;
    }

    render() {
        if (this._fields.length === 0)
            return "";
        return `GROUP BY ${this._fields.join(",")}`;
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
        this._direction = "DESC";
    }

    add(field, direction) {
        this._field = field;
        this._direction = direction == null ? "DESC" : direction;

        return this;
    }

    render() {
        if (this._field === null)
            return "";

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
        this._binding = [];
    }

    /**
     * @returns {Where|Node}
     */
    where(field, operator, value) {
        // This method will reset the `_where` object. Call `andWhere` or `orWhere` if you want to add more condition
        this._where = new Where(this);
        this._where._link = "AND";
        this._where.addLeaf("AND", field, operator, value, this._where);

        return this._where;
    }

    andWhere(field, operator, value) {
        if (this._where.isEmpty() === true)
            return this.where(field, operator, value);
        return this._where.andWhere(field, operator, value);
    }

    orWhere(field, operator, value) {
        if (this._where.isEmpty() === true)
            return this.where(field, operator, value);

        return this._where.orWhere(field, operator, value);
    }

    getWhere() {
        return this._where;
    }

    getBinding() {
        return this._binding;
    }

    async execute(connection) {
        let sql = await this.sql(connection);
        let binding = [];
        for (let key in this._binding) {
            if (this._binding.hasOwnProperty(key)) {
                sql = sql.replace(`:${key}`, "?");
                binding.push(this._binding[key]);
            }
        }
        const fn = util.promisify(connection.query).bind(connection);
        return await fn(sql, binding);
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

        return this
    };

    from(table, alias) {
        this._table = table;
        this._alias = alias;
        return this;
    }

    having(field, operator, value) {
        this._having.and(field, operator, value);

        return this._having
    };

    leftJoin(table, alias) {
        this._join.add("LEFT JOIN", table, alias);

        return this._join;
    };

    rightJoin(table, alias) {
        this._join.add("RIGHT JOIN", table, alias);

        return this._join;
    };

    innerJoin(table, alias) {
        this._join.add("INNER JOIN", table, alias);

        return this._join;
    };

    limit(offset, limit) {
        this._limit = new Limit(offset, limit);

        return this;
    }

    groupBy() {
        let args = [].slice.call(arguments);

        args.forEach(element => {
            this._groupBy.add(String(element));
        });

        return this;
    }

    orderBy(field, direction = "ASC") {
        this._orderBy.add(field, direction);

        return this;
    }

    sql() {
        if (!this._table)
            throw Error("You must specific table by calling `from` method");

        let from = `\`${this._table}\``;
        if (this._alias)
            from += ` AS \`${this._alias}\``;

        return [this._select.render().trim(), "FROM", from.trim(), this._join.render().trim(), this._where.render().trim(), this._groupBy.render().trim(), this._having.render().trim(), this._orderBy.render().trim(), this._limit.render().trim()].join(" ");
    }

    async load(connection) {
        this.limit(0, 1);
        let results = await this.execute(connection);

        return results[0] || null;
    }

    async execute(connection) {
        let sql = await this.sql(connection);
        console.log(sql);
        let binding = [];
        for (var key in this._binding) {
            if (this._binding.hasOwnProperty(key)) {
                sql = sql.replace(`:${key}`, "?");
                binding.push(this._binding[key]);
            }
        }
        //console.log(binding);
        const fn = util.promisify(connection.query).bind(connection);
        try {
            return await fn(sql, binding)
        } catch (e) {
            //console.log(e);
            if (e.errno === 1054) {
                this.orderBy(null);
                return await super.execute(connection);
            } else {
                throw e;
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
}

class UpdateQuery extends Query {
    constructor(table) {
        // Private
        super();
        this._table = table;
        this._data = {}
    }

    given(data) {
        this._data = data;

        return this;
    }

    prime(field, value) {
        this._data[field] = value;

        return this;
    }

    async sql(connection) {
        if (!this._table)
            throw Error("You need to call specific method first");
        if (Object.keys(this._data).length === 0)
            throw Error("You need provide data first");

        let fields = await new Promise((resolve, reject) => {
            connection.query(`DESCRIBE \`${this._table}\``, function (error, results, fields) {
                if (error)
                    throw new Error(error);
                else
                    resolve(results);
            });
        });
        let set = [];
        fields.forEach(field => {
            if (field["Extra"] === "auto_increment")
                return;
            if (this._data[field["Field"]] === undefined)
                return;
            let key = uniqid();
            set.push(`${field["Field"]} = :${key}`);
            this._binding[key] = this._data[field["Field"]];
        });
        if (set.length === 0)
            throw new Error("No data was provided" + this._table,);

        var sql = ["UPDATE", this._table, "SET", set.join(", "), this._where.render()].join(" ");
        // console.log(sql);
        // console.log(this._binding);

        return sql;
        //console.log(util.inspect(this._where, { showHidden: false, depth: null }))
    }
}

class InsertQuery extends Query {
    constructor(table) {
        // Private
        super();
        this._table = table;
        this._data = {};
    }

    given(data) {
        this._data = data;

        return this;
    }

    prime(field, value) {
        this._data[field] = value;

        return this;
    }

    async sql(connection) {
        if (!this._table)
            throw Error("You need to call specific method first");

        if (Object.keys(this._data).length === 0)
            throw Error("You need provide data first");

        let fields = await new Promise((resolve, reject) => {
            connection.query(`DESCRIBE \`${this._table}\``, function (error, results, fields) {
                if (error)
                    throw new Error(error);
                else
                    resolve(results)
            });
        });

        let fs = [], vs = [];
        fields.forEach(field => {
            if (field["Extra"] === "auto_increment")
                return;
            if (this._data[field["Field"]] === undefined)
                return;
            let key = uniqid();
            fs.push(`${field["Field"]}`);
            vs.push(`:${key}`);
            this._binding[key] = this._data[field["Field"]];
        });

        let sql = ["INSERT INTO", this._table, "(", fs.join(", "), ")", "VALUES", "(", vs.join(", "), ")"].join(" ");
        // console.log(sql);
        // console.log(this._binding);
        return sql;
    }
}

class InsertOnUpdateQuery extends Query {
    constructor(table) {
        // Private
        super();
        this._table = table;
        this._data = [];
    }

    given(data) {
        this._data = data;

        return this;
    }

    prime(field, value) {
        this._data[field] = value;

        return this;
    }

    async sql(connection) {
        if (!this._table)
            throw Error("You need to call specific method first");

        if (Object.keys(this._data).length === 0)
            throw Error("You need provide data first");

        let fields = await new Promise((resolve, reject) => {
            connection.query(`DESCRIBE \`${this._table}\``, function (error, results, fields) {
                if (error)
                    throw new Error(error);
                else
                    resolve(results)
            });
        });

        let fs = [], vs = [], us = [], usp = [];
        fields.forEach(field => {
            if (field["Extra"] === "auto_increment")
                return;
            if (this._data[field["Field"]] === undefined)
                return;
            let key = uniqid();
            let ukey = uniqid();
            fs.push(`${field["Field"]}`);
            vs.push(`:${key}`);
            us.push(`${field["Field"]} = :${ukey}`);
            usp[ukey] = this._data[field["Field"]];
            this._binding[key] = this._data[field["Field"]];
        });

        this._binding = { ...this._binding, ...usp };

        let sql = ["INSERT INTO", this._table, "(", fs.join(", "), ")", "VALUES", "(", vs.join(", "), ")", "ON DUPLICATE KEY UPDATE", us.join(", ")].join(" ");
        // console.log(sql);
        // console.log(this._binding);
        return sql;
    }
}

class DeleteQuery extends Query {
    constructor(table) {
        // Private
        super();
        this._table = table;
    }

    sql() {
        if (!this._table)
            throw Error("You need to call specific method first");

        return ["DELETE FROM", this._table, this._where.render().trim()].join(" ");
    }
}

module.exports = { select, insert, update, node, del, insertOnUpdate };

function select() {
    let select = new SelectQuery();
    let args = [...arguments];
    if (args[0] === "*")
        return select;
    args.forEach(arg => {
        if (typeof arg == "string")
            select.select(arg);
    });

    return select;
}

function insert(table) {
    return new InsertQuery(table);
}

function insertOnUpdate(table) {
    return new InsertOnUpdateQuery(table);
}

function update(table) {
    return new UpdateQuery(table);
}

function del(table) {
    return new DeleteQuery(table);
}

/**
 *
 * @param {*} link
 * @Return {Node}
 */
function node(link) {
    let node = new Node();
    node._link = link;

    return node;
}