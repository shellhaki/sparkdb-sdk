export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
export type Row = Record<string, unknown>;
export type Document = Record<string, unknown>;
export type Where<T extends object = Row> = Partial<T> & Record<string, unknown>;
export type Filter = Record<string, unknown>;

export type DatabaseType = 'postgres' | 'mysql' | 'mongodb';

export type SparkClientOptions = {
  /** Override the SparkDB API base URL. Defaults to https://api.sparkdb.pro */
  baseUrl?: string;
  /** Provide a custom fetch (e.g. for Node < 18 or testing). */
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

export type MongoFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';

export type MongoSchemaField = {
  name: string;
  type: MongoFieldType | string;
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

export type RequestBody = Record<string, unknown>;
