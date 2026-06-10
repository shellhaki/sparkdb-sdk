export { SparkClient, PostgresClient, MySQLClient, MongoDBClient } from './client.js';
export { TableQuery } from './table.js';
export { CollectionClient } from './collection.js';
export { Storage, BucketHandle } from './storage.js';
export { SparkError } from './errors.js';
import { SparkClient } from './client.js';
// Backwards-compatible aliases: the original API used a lowercase `client`.
export { SparkClient as client };
export default SparkClient;
