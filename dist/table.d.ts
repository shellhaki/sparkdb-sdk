import type { QueryResult, Row, Where } from './types.js';
type Requester = {
    request<T>(path: string, body: Record<string, unknown>): Promise<T>;
};
/**
 * Chainable relational query builder. Immutable — each call returns a new
 * builder, so you can branch safely.
 *
 *   db.from('users').where({ plan: 'pro' }).limit(10).select()
 *   db.from('users').where({ id: 1 }).single()
 *   db.from('users').insert({ email: 'ada@sparkdb.pro' })
 *   db.from('users').where({ id: 1 }).update({ name: 'Ada' })
 *   db.from('users').where({ id: 1 }).delete()
 */
export declare class TableQuery<T extends object = Row> {
    private readonly spark;
    private readonly table;
    private readonly filters;
    private readonly rowLimit?;
    private readonly rowOffset?;
    constructor(spark: Requester, table: string, filters?: Where<T>, rowLimit?: number, rowOffset?: number);
    /** Add equality filters (merged with any existing). */
    where(filters: Where<T>): TableQuery<T>;
    limit(limit: number): TableQuery<T>;
    offset(offset: number): TableQuery<T>;
    /** Fetch matching rows. */
    select(): Promise<T[]>;
    /** Fetch the first matching row, or null. */
    single(): Promise<T | null>;
    insert(values: Partial<T>): Promise<QueryResult>;
    update(values: Partial<T>): Promise<QueryResult>;
    delete(): Promise<QueryResult>;
}
export {};
