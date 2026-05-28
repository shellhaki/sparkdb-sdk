export class SparkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'SparkError';
        this.status = status;
    }
}
export class client {
    constructor(databaseUrl, apiKey, options = {}) {
        var _a;
        if (!databaseUrl)
            throw new Error('SparkDB database url is required.');
        if (!apiKey)
            throw new Error('SparkDB api key is required.');
        this.databaseUrl = databaseUrl;
        this.apiKey = apiKey;
        this.baseUrl = (options.baseUrl ?? 'https://api.sparkdb.pro').replace(/\/$/, '');
        const fetcher = options.fetch ?? ((_a = globalThis.fetch) === null || _a === void 0 ? void 0 : _a.bind(globalThis));
        if (!fetcher)
            throw new Error('SparkDB SDK requires fetch. Pass options.fetch in this runtime.');
        this.fetcher = fetcher;
    }
    from(table) {
        return new TableClient(this, table);
    }
    async schema() {
        return this.request('/api/sdk/schema', {});
    }
    async query(query) {
        return this.request('/api/sdk/query', { query });
    }
    async createTable(name, columns, schema) {
        return this.request('/api/sdk/table/create', {
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
    async dropTable(name) {
        return this.request('/api/sdk/table/drop', { name });
    }
    async request(path, body) {
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
                const payload = await response.json();
                message = payload.error ?? payload.message ?? message;
            }
            catch { }
            throw new SparkError(message, response.status);
        }
        const text = await response.text();
        if (!text)
            return undefined;
        return JSON.parse(text);
    }
}
export class TableClient {
    constructor(spark, table, filters = {}, rowLimit) {
        if (!table)
            throw new Error('SparkDB table name is required.');
        this.spark = spark;
        this.table = table;
        this.filters = filters;
        this.rowLimit = rowLimit;
    }
    where(filters) {
        return new TableClient(this.spark, this.table, { ...this.filters, ...filters }, this.rowLimit);
    }
    limit(limit) {
        return new TableClient(this.spark, this.table, this.filters, limit);
    }
    async select() {
        const result = await this.spark.request('/api/sdk/table/select', {
            table: this.table,
            where: this.filters,
            limit: this.rowLimit
        });
        return result.rows;
    }
    async insert(values) {
        return this.spark.request('/api/sdk/table/insert', {
            table: this.table,
            values
        });
    }
    async update(values) {
        return this.spark.request('/api/sdk/table/update', {
            table: this.table,
            values,
            where: this.filters
        });
    }
    async delete() {
        return this.spark.request('/api/sdk/table/delete', {
            table: this.table,
            where: this.filters
        });
    }
}
export { client as SparkClient };
export default client;
