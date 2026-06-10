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
export declare class CollectionClient<T extends object = Row> {
    private readonly spark;
    private readonly name;
    constructor(spark: Requester, name: string);
    /** Insert a single document. */
    insertOne(document: Partial<T> & Document): Promise<QueryResult>;
    /** Insert several documents (sequential; resolves to per-insert results). */
    insertMany(documents: Array<Partial<T> & Document>): Promise<QueryResult[]>;
    /** Find documents matching a filter. */
    find(filter?: Filter, options?: {
        limit?: number;
        offset?: number;
    }): Promise<T[]>;
    /** Find the first matching document, or null. */
    findOne(filter?: Filter): Promise<T | null>;
    /** Set fields on every document matching the filter. */
    updateMany(filter: Filter, values: Partial<T> & Document): Promise<QueryResult>;
    /** Delete documents matching the filter. */
    deleteMany(filter: Filter): Promise<QueryResult>;
}
export {};
