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
export class TableQuery<T extends object = Row> {
  private readonly spark: Requester;
  private readonly table: string;
  private readonly filters: Where<T>;
  private readonly rowLimit?: number;
  private readonly rowOffset?: number;

  constructor(spark: Requester, table: string, filters: Where<T> = {}, rowLimit?: number, rowOffset?: number) {
    if (!table) throw new Error('SparkDB table name is required.');
    this.spark = spark;
    this.table = table;
    this.filters = filters;
    this.rowLimit = rowLimit;
    this.rowOffset = rowOffset;
  }

  /** Add equality filters (merged with any existing). */
  where(filters: Where<T>): TableQuery<T> {
    return new TableQuery<T>(this.spark, this.table, { ...this.filters, ...filters }, this.rowLimit, this.rowOffset);
  }

  limit(limit: number): TableQuery<T> {
    return new TableQuery<T>(this.spark, this.table, this.filters, limit, this.rowOffset);
  }

  offset(offset: number): TableQuery<T> {
    return new TableQuery<T>(this.spark, this.table, this.filters, this.rowLimit, offset);
  }

  /** Fetch matching rows. */
  async select(): Promise<T[]> {
    const result = await this.spark.request<QueryResult<T>>('/api/sdk/table/select', {
      table: this.table,
      where: this.filters,
      limit: this.rowLimit,
      offset: this.rowOffset
    });
    return result.rows ?? [];
  }

  /** Fetch the first matching row, or null. */
  async single(): Promise<T | null> {
    const rows = await this.limit(1).select();
    return rows[0] ?? null;
  }

  async insert(values: Partial<T>): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/insert', { table: this.table, values });
  }

  async update(values: Partial<T>): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/update', {
      table: this.table,
      values,
      where: this.filters
    });
  }

  async delete(): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/delete', { table: this.table, where: this.filters });
  }
}
