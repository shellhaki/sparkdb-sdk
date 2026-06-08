import type { Document, Filter, QueryResult, Row } from './types.js';

type Requester = {
  request<T>(path: string, body: Record<string, unknown>): Promise<T>;
};

/**
 * MongoDB document API. Reads like the Mongo driver, but runs through SparkDB.
 *
 *   db.collection('events').insertOne({ name: 'user.created' })
 *   db.collection('events').find({ name: 'user.created' })
 *   db.collection('events').findOne({ _id: '...' })
 *   db.collection('events').updateMany({ name: 'x' }, { seen: true })
 *   db.collection('events').deleteMany({ name: 'x' })
 */
export class CollectionClient<T extends object = Row> {
  private readonly spark: Requester;
  private readonly name: string;

  constructor(spark: Requester, name: string) {
    if (!name) throw new Error('SparkDB collection name is required.');
    this.spark = spark;
    this.name = name;
  }

  /** Insert a single document. */
  async insertOne(document: Partial<T> & Document): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/insert', { table: this.name, values: document });
  }

  /** Insert several documents (sequential; resolves to per-insert results). */
  async insertMany(documents: Array<Partial<T> & Document>): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    for (const document of documents) {
      results.push(await this.insertOne(document));
    }
    return results;
  }

  /** Find documents matching a filter. */
  async find(filter: Filter = {}, options: { limit?: number; offset?: number } = {}): Promise<T[]> {
    const result = await this.spark.request<QueryResult<T>>('/api/sdk/table/select', {
      table: this.name,
      where: filter,
      limit: options.limit,
      offset: options.offset
    });
    return result.rows ?? [];
  }

  /** Find the first matching document, or null. */
  async findOne(filter: Filter = {}): Promise<T | null> {
    const rows = await this.find(filter, { limit: 1 });
    return rows[0] ?? null;
  }

  /** Set fields on every document matching the filter. */
  async updateMany(filter: Filter, values: Partial<T> & Document): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/update', {
      table: this.name,
      values,
      where: filter
    });
  }

  /** Delete documents matching the filter. */
  async deleteMany(filter: Filter): Promise<QueryResult> {
    return this.spark.request<QueryResult>('/api/sdk/table/delete', { table: this.name, where: filter });
  }
}
