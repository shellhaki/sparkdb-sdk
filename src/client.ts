import { SparkError } from './errors.js';
import { TableQuery } from './table.js';
import { CollectionClient } from './collection.js';
import { Storage } from './storage.js';
import type {
  ColumnDefinition,
  DatabaseType,
  MongoSchemaField,
  QueryResult,
  RequestBody,
  Row,
  Schema,
  SparkClientOptions,
  SparkCredentials
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.sparkdb.pro';

type ClientConstructorInput = SparkCredentials | string;

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
export class SparkClient {
  readonly type: DatabaseType;
  private readonly databaseUrl: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private storageClient?: Storage;

  constructor(type: DatabaseType, credentials: SparkCredentials, options?: SparkClientOptions);
  constructor(databaseUrl: string, apiKey: string, options?: SparkClientOptions);
  constructor(
    typeOrDatabaseUrl: DatabaseType | string,
    credentialsOrApiKey: ClientConstructorInput,
    options: SparkClientOptions = {}
  ) {
    const { type, databaseUrl, apiKey } = normalizeConstructorArgs(typeOrDatabaseUrl, credentialsOrApiKey);

    if (!databaseUrl) throw new Error('SparkDB database url is required.');
    if (!apiKey) throw new Error('SparkDB api key is required.');

    this.type = type;
    this.databaseUrl = databaseUrl;
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');

    const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetcher) throw new Error('SparkDB SDK requires fetch. Pass options.fetch in this runtime.');
    this.fetcher = fetcher;
  }

  /** Relational table access: `from('users').where({ id: 1 }).select()`. */
  from<T extends object = Row>(table: string): TableQuery<T> {
    return new TableQuery<T>(this, table);
  }

  /** Mongo collection access: `collection('events').insertOne({...})`. */
  collection<T extends object = Row>(name: string): CollectionClient<T> {
    return new CollectionClient<T>(this, name);
  }

  /** Inspect tables/collections, columns, and inferred schema. */
  async schema(): Promise<Schema> {
    return this.request<Schema>('/api/sdk/schema', {});
  }

  /** Run a raw SQL string (Postgres/MySQL) or a Mongo command JSON string. */
  async query<T extends object = Row>(query: string): Promise<QueryResult<T>> {
    return this.request<QueryResult<T>>('/api/sdk/query', { query });
  }

  /** Create a relational table. */
  async createTable(name: string, columns: ColumnDefinition[]): Promise<QueryResult> {
    return this.request<QueryResult>('/api/sdk/table/create', {
      name,
      columns: columns.map((column) => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable ?? false,
        primary_key: column.primary_key ?? column.primaryKey ?? false
      }))
    });
  }

  /** Create a Mongo collection. Schema fields are optional (validation). */
  async createCollection(name: string, schema: MongoSchemaField[] = []): Promise<QueryResult> {
    return this.request<QueryResult>('/api/sdk/table/create', {
      name,
      columns: [],
      schema: schema.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required ?? false
      }))
    });
  }

  /** Drop a table or collection. */
  async dropTable(name: string): Promise<QueryResult> {
    return this.request<QueryResult>('/api/sdk/table/drop', { name });
  }

  /** Drop a collection (alias of dropTable for Mongo ergonomics). */
  async dropCollection(name: string): Promise<QueryResult> {
    return this.dropTable(name);
  }

  /** Object storage (Spark Bucket): `storage.bucket('avatars').upload(file)`. */
  get storage(): Storage {
    if (!this.storageClient) this.storageClient = new Storage(this);
    return this.storageClient;
  }

  /** Database request: POST with the database URL injected (table/query endpoints). */
  async request<T>(path: string, body: RequestBody): Promise<T> {
    return this.call<T>('POST', path, { json: { database_url: this.databaseUrl, ...body } });
  }

  /**
   * Low-level authenticated call. Supports any verb, JSON or multipart bodies.
   * The Files API uses this for GET/DELETE/upload; `request` wraps it for the
   * database endpoints.
   */
  async call<T>(method: string, path: string, init: { json?: unknown; body?: BodyInit } = {}): Promise<T> {
    const headers: Record<string, string> = { 'X-Spark-API-Key': this.apiKey };
    let body: BodyInit | undefined;
    if (init.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.json);
    } else if (init.body !== undefined) {
      body = init.body; // FormData sets its own multipart Content-Type
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, { method, headers, body });

    if (!response.ok) {
      let message = `SparkDB request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: string; message?: string };
        message = payload.error ?? payload.message ?? message;
      } catch {
        /* keep default message */
      }
      throw new SparkError(message, response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

function normalizeConstructorArgs(typeOrDatabaseUrl: DatabaseType | string, credentialsOrApiKey: ClientConstructorInput) {
  if (isDatabaseType(typeOrDatabaseUrl)) {
    const credentials = credentialsOrApiKey as SparkCredentials;
    return {
      type: typeOrDatabaseUrl,
      databaseUrl: credentials.database_url ?? credentials.databaseUrl ?? '',
      apiKey: credentials.apiKey ?? credentials.apikey ?? ''
    };
  }

  return {
    type: inferDatabaseType(typeOrDatabaseUrl),
    databaseUrl: typeOrDatabaseUrl,
    apiKey: String(credentialsOrApiKey ?? '')
  };
}

function isDatabaseType(value: string): value is DatabaseType {
  return value === 'postgres' || value === 'mysql' || value === 'mongodb';
}

function inferDatabaseType(databaseUrl: string): DatabaseType {
  if (databaseUrl.startsWith('mysql://')) return 'mysql';
  if (databaseUrl.startsWith('mongodb://') || databaseUrl.startsWith('mongodb+srv://')) return 'mongodb';
  return 'postgres';
}

/** Engine-specific shortcuts. */
export class PostgresClient extends SparkClient {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('postgres', credentials, options);
  }
}

export class MySQLClient extends SparkClient {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('mysql', credentials, options);
  }
}

export class MongoDBClient extends SparkClient {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('mongodb', credentials, options);
  }
}
