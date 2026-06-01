export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export type Row = Record<string, unknown>;
export type Where<T extends object = Row> = Partial<T>;
export type DatabaseType = 'postgres' | 'mysql' | 'mongodb';
export type SparkClientOptions = {
    baseUrl?: string;
    fetch?: typeof fetch;
};
export type SparkCredentials = {
    database_url?: string;
    databaseUrl?: string;
    apiKey?: string;
    apikey?: string;
};
export type QueryResult<T extends object = Row> = {
    columns: string[];
    rows: T[];
    rows_affected: number;
    duration_ms: number;
    message: string;
};
export type ColumnType = 'text' | 'varchar' | 'integer' | 'bigint' | 'boolean' | 'numeric' | 'timestamp' | 'json' | 'uuid' | 'serial' | 'bigserial';
export type ColumnDefinition = {
    name: string;
    type: ColumnType | string;
    nullable?: boolean;
    primary_key?: boolean;
    primaryKey?: boolean;
};
export type MongoSchemaField = {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | string;
    required?: boolean;
};
export type SchemaColumn = {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
};
export type SchemaTable = {
    name: string;
    columns: SchemaColumn[];
    schema?: MongoSchemaField[];
};
export type Schema = {
    database_id: number;
    type: DatabaseType | string;
    tables: SchemaTable[];
};
export type MigrationTableOptions = {
    name: string;
    targetName?: string;
    where?: Where;
    limit?: number;
};
export type MigrationOptions = {
    tables?: Array<string | MigrationTableOptions>;
    dropExisting?: boolean;
};
export type MigrationTableResult = {
    source: string;
    target: string;
    rows_read: number;
    rows_written: number;
    created: boolean;
};
export type MigrationResult = {
    from: DatabaseType | string;
    to: DatabaseType | string;
    tables: MigrationTableResult[];
    rows_read: number;
    rows_written: number;
    duration_ms: number;
    message: string;
};
type RequestBody = Record<string, unknown>;
export declare class SparkError extends Error {
    status: number;
    constructor(message: string, status: number);
}
export declare class client {
    readonly type: DatabaseType;
    private readonly databaseUrl;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly fetcher;
    constructor(type: DatabaseType, credentials: SparkCredentials, options?: SparkClientOptions);
    constructor(databaseUrl: string, apiKey: string, options?: SparkClientOptions);
    from<T extends object = Row>(table: string): TableClient<T>;
    schema(): Promise<Schema>;
    query<T extends object = Row>(query: string): Promise<QueryResult<T>>;
    createTable(name: string, columns: ColumnDefinition[], schema?: MongoSchemaField[]): Promise<QueryResult<Row>>;
    dropTable(name: string): Promise<QueryResult<Row>>;
    migrateTo(target: client, options?: MigrationOptions): Promise<MigrationResult>;
    migrateFrom(source: client, options?: MigrationOptions): Promise<MigrationResult>;
    request<T>(path: string, body: RequestBody): Promise<T>;
}
export declare class PostgresClient extends client {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
export declare class MySQLClient extends client {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
export declare class MongoDBClient extends client {
    constructor(credentials: SparkCredentials, options?: SparkClientOptions);
}
export declare class TableClient<T extends object = Row> {
    private readonly spark;
    private readonly table;
    private readonly filters;
    private readonly rowLimit?;
    constructor(spark: client, table: string, filters?: Where<T>, rowLimit?: number);
    where(filters: Where<T>): TableClient<T>;
    limit(limit: number): TableClient<T>;
    select(): Promise<T[]>;
    insert(values: Partial<T>): Promise<QueryResult<Row>>;
    update(values: Partial<T>): Promise<QueryResult<Row>>;
    delete(): Promise<QueryResult<Row>>;
}
export { client as SparkClient };
export default client;
