export function select(...args: any[]): SelectQuery;
export function insert(table: any): InsertQuery;
export function update(table: any): UpdateQuery;
export function node(link: any): Node;
export function del(table: any): DeleteQuery;
export function insertOnUpdate(table: any, conflictColumns: any): InsertOnUpdateQuery;
export function getConnection(pool: any): Promise<any>;
export function startTransaction(connection: any): Promise<void>;
export function commit(connection: any): Promise<void>;
export function rollback(connection: any): Promise<void>;
export function release(connection: any): void;
export function execute(connection: any, query: any): Promise<any>;
export function sql(value: any): {
    value: any;
    isSQL: boolean;
};
export function value(val: any): {
    value: any;
    isSQL: boolean;
};
declare class SelectQuery extends Query {
    _table: any;
    _alias: any;
    _select: Select;
    _having: Having;
    _join: Join;
    _limit: Limit;
    _groupBy: GroupBy;
    _orderBy: OrderBy;
    select(field: any, alias: any): this;
    from(table: any, alias: any): this;
    having(field: any, operator: any, value: any): Having;
    leftJoin(table: any, alias: any): Join;
    rightJoin(table: any, alias: any): Join;
    innerJoin(table: any, alias: any): Join;
    limit(offset: any, limit: any): this;
    groupBy(...args: any[]): this;
    orderBy(field: any, direction?: string): this;
    orderDirection(direction: any): this;
    sql(): string;
    load(connection: any, releaseConnection?: boolean): Promise<any>;
    clone(): SelectQuery;
    removeOrderBy(): this;
    removeGroupBy(): this;
    removeLimit(): this;
}
declare class InsertQuery extends Query {
    constructor(table: any);
    _table: any;
    _primaryColumn: any;
    _data: {};
    given(data: any): this;
    prime(field: any, value: any): this;
    sql(connection: any): Promise<string>;
}
declare class UpdateQuery extends Query {
    constructor(table: any);
    _table: any;
    _primaryColumn: any;
    _data: {};
    given(data: any): this;
    prime(field: any, value: any): this;
    sql(connection: any): Promise<string>;
}
declare class Node {
    constructor(query: any, defaultValueTreatment?: string);
    _defaultValueTreatment: string;
    _tree: any[];
    _link: any;
    _parent: any;
    _query: any;
    addLeaf(link: any, field: any, operator: any, value: any): this;
    addRaw(link: any, sql: any, binding?: {}): this;
    addNode(node: any): any;
    /**
     * This method will empty the tree
     */
    empty(): this;
    getLeafs(): any[];
    getNodes(): any[];
    isEmpty(): boolean;
    findLeaf(link: any, field: any, operator: any, value: any): void;
    getBinding(): {};
    and(field: any, operator: any, value: any): this;
    or(field: any, operator: any, value: any): this;
    render(): string;
    execute(connection: any, releaseConnection?: boolean): Promise<any>;
    load(connection: any, releaseConnection?: boolean): Promise<any>;
    clone(query: any, parent: any): Node;
}
declare class DeleteQuery extends Query {
    constructor(table: any);
    _table: any;
    sql(): string;
}
declare class InsertOnUpdateQuery extends Query {
    constructor(table: any, conflictColumns: any);
    _table: any;
    _data: any[];
    _conflictColumns: any;
    given(data: any): this;
    prime(field: any, value: any): this;
    sql(connection: any): Promise<string>;
}
declare class Query {
    _where: Where;
    _binding: any[];
    /**
     * @returns {Where|Node}
     */
    where(field: any, operator: any, value: any): Where | Node;
    andWhere(field: any, operator: any, value: any): Node;
    orWhere(field: any, operator: any, value: any): Node;
    getWhere(): Where;
    getBinding(): any[];
    execute(connection: any, releaseConnection?: boolean): Promise<any>;
}
declare class Select {
    _fields: any[];
    select(field: any, alias: any): this;
    render(): string;
    clone(): any;
}
declare class Having extends Node {
    constructor(query: any);
    _link: string;
    clone(query: any): any;
}
declare class Join {
    constructor(query: any);
    _joins: any[];
    _query: any;
    add(type: any, table: any, alias: any): this;
    on(column: any, operator: any, referencedColumn: any): any;
    render(): string;
    clone(query: any): Join;
}
declare class Limit {
    constructor(offset?: any, limit?: any);
    _offset: any;
    _limit: any;
    render(): string;
    clone(): any;
}
declare class GroupBy {
    _fields: any[];
    add(field: any): this;
    render(): string;
    clone(): GroupBy;
}
declare class OrderBy {
    _field: any;
    _direction: string;
    add(field: any, direction: any): this;
    render(): string;
    clone(): any;
}
declare class Where extends Node {
    constructor(query: any);
    andWhere(field: any, operator: any, value: any): Node;
    orWhere(field: any, operator: any, value: any): Node;
    clone(query: any): Where;
}
export {};
