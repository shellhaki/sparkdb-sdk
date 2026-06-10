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
export class TableQuery {
    constructor(spark, table, filters = {}, rowLimit, rowOffset) {
        if (!table)
            throw new Error('SparkDB table name is required.');
        this.spark = spark;
        this.table = table;
        this.filters = filters;
        this.rowLimit = rowLimit;
        this.rowOffset = rowOffset;
    }
    /** Add equality filters (merged with any existing). */
    where(filters) {
        return new TableQuery(this.spark, this.table, { ...this.filters, ...filters }, this.rowLimit, this.rowOffset);
    }
    limit(limit) {
        return new TableQuery(this.spark, this.table, this.filters, limit, this.rowOffset);
    }
    offset(offset) {
        return new TableQuery(this.spark, this.table, this.filters, this.rowLimit, offset);
    }
    /** Fetch matching rows. */
    async select() {
        const result = await this.spark.request('/api/sdk/table/select', {
            table: this.table,
            where: this.filters,
            limit: this.rowLimit,
            offset: this.rowOffset
        });
        return result.rows ?? [];
    }
    /** Fetch the first matching row, or null. */
    async single() {
        const rows = await this.limit(1).select();
        return rows[0] ?? null;
    }
    async insert(values) {
        return this.spark.request('/api/sdk/table/insert', { table: this.table, values });
    }
    async update(values) {
        return this.spark.request('/api/sdk/table/update', {
            table: this.table,
            values,
            where: this.filters
        });
    }
    async delete() {
        return this.spark.request('/api/sdk/table/delete', { table: this.table, where: this.filters });
    }
}
