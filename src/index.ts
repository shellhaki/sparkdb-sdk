export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
export type Row = Record<string, unknown>;
export type Where<T extends object = Row> = Partial<T>;

export type SparkClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
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
  type: 'postgres' | 'mysql' | 'mongodb' | string;
  tables: SchemaTable[];
};

type RequestBody = Record<string, unknown>;

export class SparkError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SparkError';
    this.status = status;
  }
}

export class client {
  private readonly databaseUrl: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(databaseUrl: string, apiKey: string, options: SparkClientOptions = {}) {
    if (!databaseUrl) throw new Error('SparkDB database url is required.');
    if (!apiKey) throw new Error('SparkDB api key is required.');

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

export { client as SparkClient };
export default client;
