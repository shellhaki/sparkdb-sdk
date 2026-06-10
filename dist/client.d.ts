import { TableQuery } from './table.js';
import { CollectionClient } from './collection.js';
import { Storage } from './storage.js';
import type { ColumnDefinition, DatabaseType, MongoSchemaField, QueryResult, RequestBody, Row, Schema, SparkClientOptions, SparkCredentials } from './types.js';
/**
 * SparkDB client. Talks to a single managed database via its connection URL
 * plus an API key.
 *
 * Two constructor styles:
 *   new SparkClient('postgres', { database_url, apiKey })
 *   new SparkClient(databaseUrl, apiKey)
 *
 * Relational engines (Postgres/MySQL) use `from()`; MongoDB uses `collection()`.
 */
export declare class SparkClient {
    readonly type: DatabaseType;
    private readonly databaseUrl;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly fetcher;
    private storageClient?;
    constructor(type: DatabaseType, credentials: SparkCredentials, options?: SparkClientOptions);
    constructor(databaseUrl: string, apiKey: string, options?: SparkClientOptions);
    /** Relational table access: `from('users').where({ id: 1 }).select()`. */
    from<T extends object = Row>(table: string): TableQuery<T>;
    /** Mongo collection access: `collection('events').insertOne({...})`. */
    collection<T extends object = Row>(name: string): CollectionClient<T>;
    /** Inspect tables/collections, columns, and inferred schema. */
    schema(): Promise<Schema>;
    /** Run a raw SQL string (Postgres/MySQL) or a Mongo command JSON string. */
    query<T extends object = Row>(query: string): Promise<QueryResult<T>>;
    /** Create a relational table. */
    createTable(name: string, columns: ColumnDefinition[]): Promise<QueryResult>;
    /** Create a Mongo collection. Schema fields are optional (validation). */
    createCollection(name: string, schema?: MongoSchemaField[]): Promise<QueryResult>;
    /** Drop a table or collection. */
    dropTable(name: string): Promise<QueryResult>;
    /** Drop a collection (alias of dropTable for Mongo ergonomics). */
    dropCollection(name: string): Promise<QueryResult>;
    /** Object storage (Spark Bucket): `storage.bucket('avatars').upload(file)`. */
    get storage(): Storage;
    /** Database request: POST with the database URL injected (table/query endpoints). */
    request<T>(path: string, body: RequestBody): Promise<T>;
    /**
     * Low-level authenticated call. Supports any verb, JSON or multipart bodies.
     * The Files API uses this for GET/DELETE/upload; `request` wraps it for the
     * database endpoints.
     */
    call<T>(method: string, path: string, init?: {
        json?: unknown;
        body?: BodyInit;
    }): Promise<T>;
}
/** Engine-specific shortcuts. */
export declare class PostgresClient extends SparkClient {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
export declare class MySQLClient extends SparkClient {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
export declare class MongoDBClient extends SparkClient {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
