export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
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

export type ColumnType =
  | 'text'
  | 'varchar'
  | 'integer'
  | 'bigint'
  | 'boolean'
  | 'numeric'
  | 'timestamp'
  | 'json'
  | 'uuid'
  | 'serial'
  | 'bigserial';

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
type ClientConstructorInput = SparkCredentials | string;

export class SparkError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SparkError';
    this.status = status;
  }
}

export class client {
  readonly type: DatabaseType;
  private readonly databaseUrl: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(type: DatabaseType, credentials: SparkCredentials, options?: SparkClientOptions);
  constructor(databaseUrl: string, apiKey: string, options?: SparkClientOptions);
  constructor(typeOrDatabaseUrl: DatabaseType | string, credentialsOrApiKey: ClientConstructorInput, options: SparkClientOptions = {}) {
    const { type, databaseUrl, apiKey } = normalizeConstructorArgs(typeOrDatabaseUrl, credentialsOrApiKey);

    if (!databaseUrl) throw new Error('SparkDB database url is required.');
    if (!apiKey) throw new Error('SparkDB api key is required.');

    this.type = type;
    this.databaseUrl = databaseUrl;
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.sparkdb.pro').replace(/\/$/, '');
    const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetcher) throw new Error('SparkDB SDK requires fetch. Pass options.fetch in this runtime.');
    this.fetcher = fetcher;
  }

  from<T extends object = Row>(table: string) {
    return new TableClient<T>(this, table);
  }

  async schema() {
    return this.request<Schema>('/api/sdk/schema', {});
  }

  async query<T extends object = Row>(query: string) {
    return this.request<QueryResult<T>>('/api/sdk/query', { query });
  }

  async createTable(name: string, columns: ColumnDefinition[], schema?: MongoSchemaField[]) {
    return this.request<QueryResult>('/api/sdk/table/create', {
      name,
      columns: columns.map((column) => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable ?? false,
        primary_key: column.primary_key ?? column.primaryKey ?? false
      })),
      schema
    });
  }

  async dropTable(name: string) {
    return this.request<QueryResult>('/api/sdk/table/drop', { name });
  }

  async migrateTo(target: client, options: MigrationOptions = {}) {
    return this.request<MigrationResult>('/api/sdk/migrate', {
      target_database_url: target.databaseUrl,
      source_type: this.type,
      target_type: target.type,
      ...normalizeMigrationOptions(options)
    });
  }

  async migrateFrom(source: client, options: MigrationOptions = {}) {
    return source.migrateTo(this, options);
  }

  async request<T>(path: string, body: RequestBody): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Spark-API-Key': this.apiKey
      },
      body: JSON.stringify({
        database_url: this.databaseUrl,
        ...body
      })
    });

    if (!response.ok) {
      let message = `SparkDB request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: string; message?: string };
        message = payload.error ?? payload.message ?? message;
      } catch {}
      throw new SparkError(message, response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

export class PostgresClient extends client {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('postgres', credentials, options);
  }
}

export class MySQLClient extends client {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('mysql', credentials, options);
  }
}

export class MongoDBClient extends client {
  constructor(credentials: SparkCredentials, options?: SparkClientOptions) {
    super('mongodb', credentials, options);
  }
}

export class TableClient<T extends object = Row> {
  private readonly spark: client;
  private readonly table: string;
  private readonly filters: Where<T>;
  private readonly rowLimit?: number;

  constructor(spark: client, table: string, filters: Where<T> = {}, rowLimit?: number) {
    if (!table) throw new Error('SparkDB table name is required.');
    this.spark = spark;
    this.table = table;
    this.filters = filters;
    this.rowLimit = rowLimit;
  }

  where(filters: Where<T>) {
    return new TableClient<T>(this.spark, this.table, { ...this.filters, ...filters }, this.rowLimit);
  }

  limit(limit: number) {
    return new TableClient<T>(this.spark, this.table, this.filters, limit);
  }

  async select() {
    const result = await this.spark.request<QueryResult<T>>('/api/sdk/table/select', {
      table: this.table,
      where: this.filters,
      limit: this.rowLimit
    });
    return result.rows;
  }

  async insert(values: Partial<T>) {
    return this.spark.request<QueryResult>('/api/sdk/table/insert', {
      table: this.table,
      values
    });
  }

  async update(values: Partial<T>) {
    return this.spark.request<QueryResult>('/api/sdk/table/update', {
      table: this.table,
      values,
      where: this.filters
    });
  }

  async delete() {
    return this.spark.request<QueryResult>('/api/sdk/table/delete', {
      table: this.table,
      where: this.filters
    });
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

function normalizeMigrationOptions(options: MigrationOptions) {
  return {
    tables: options.tables?.map((table) => (typeof table === 'string' ? { name: table } : table)),
    drop_existing: options.dropExisting ?? false
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

export { client as SparkClient };
export default client;
