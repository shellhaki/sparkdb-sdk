/**
 * MongoDB document API. Reads like the Mongo driver, but runs through SparkDB.
 *
 *   db.collection('events').insertOne({ name: 'user.created' })
 *   db.collection('events').find({ name: 'user.created' })
 *   db.collection('events').findOne({ _id: '...' })
 *   db.collection('events').updateMany({ name: 'x' }, { seen: true })
 *   db.collection('events').deleteMany({ name: 'x' })
 */
export class CollectionClient {
    constructor(spark, name) {
        if (!name)
            throw new Error('SparkDB collection name is required.');
        this.spark = spark;
        this.name = name;
    }
    /** Insert a single document. */
    async insertOne(document) {
        return this.spark.request('/api/sdk/table/insert', { table: this.name, values: document });
    }
    /** Insert several documents (sequential; resolves to per-insert results). */
    async insertMany(documents) {
        const results = [];
        for (const document of documents) {
            results.push(await this.insertOne(document));
        }
        return results;
    }
    /** Find documents matching a filter. */
    async find(filter = {}, options = {}) {
        const result = await this.spark.request('/api/sdk/table/select', {
            table: this.name,
            where: filter,
            limit: options.limit,
            offset: options.offset
        });
        return result.rows ?? [];
    }
    /** Find the first matching document, or null. */
    async findOne(filter = {}) {
        const rows = await this.find(filter, { limit: 1 });
        return rows[0] ?? null;
    }
    /** Set fields on every document matching the filter. */
    async updateMany(filter, values) {
        return this.spark.request('/api/sdk/table/update', {
            table: this.name,
            values,
            where: filter
        });
    }
    /** Delete documents matching the filter. */
    async deleteMany(filter) {
        return this.spark.request('/api/sdk/table/delete', { table: this.name, where: filter });
    }
}
