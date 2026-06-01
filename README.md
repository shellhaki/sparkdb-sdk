# @shellhaki/sparkdb-sdk

TypeScript SDK and lightweight ORM client for SparkDB.

```ts
import { client } from '@shellhaki/sparkdb-sdk';

type User = {
  id: number;
  email: string;
  name: string;
};

const db = new client('postgres', {
  database_url: process.env.SPARK_DATABASE_URL!,
  apiKey: process.env.SPARK_API_KEY!
});

await db.createTable('users', [
  { name: 'id', type: 'serial', primaryKey: true },
  { name: 'email', type: 'text' },
  { name: 'name', type: 'text', nullable: true }
]);

await db.from<User>('users').insert({
  email: 'ada@sparkdb.pro',
  name: 'Ada'
});

const users = await db.from<User>('users').where({ email: 'ada@sparkdb.pro' }).limit(1).select();

await db.from<User>('users').where({ email: 'ada@sparkdb.pro' }).update({ name: 'Ada Lovelace' });
await db.from<User>('users').where({ email: 'ada@sparkdb.pro' }).delete();
```

Use the same CRUD syntax across the three supported database clients:

```ts
import { MongoDBClient, MySQLClient, PostgresClient, client } from '@shellhaki/sparkdb-sdk';

const postgres = new PostgresClient({ database_url: process.env.POSTGRES_URL!, apiKey: process.env.SPARK_API_KEY! });
const mysql = new MySQLClient({ database_url: process.env.MYSQL_URL!, apiKey: process.env.SPARK_API_KEY! });
const mongo = new MongoDBClient({ database_url: process.env.MONGO_URL!, apiKey: process.env.SPARK_API_KEY! });

const alsoPostgres = new client('postgres', { database_url: process.env.POSTGRES_URL!, apiKey: process.env.SPARK_API_KEY! });

await postgres.from('users').where({ id: 1 }).select();
await mysql.from('customers').insert({ id: 1, email: 'ops@sparkdb.pro' });
await mongo.from('events').insert({ name: 'user.created', metadata: { source: 'sdk' } });
```

Migrate between any supported pair by pointing one client at another:

```ts
const result = await postgres.migrateTo(mysql, {
  tables: ['users', { name: 'orders', targetName: 'customer_orders' }],
  dropExisting: false
});

await mongo.migrateFrom(mysql, { tables: ['customers'] });
```

The SDK sends the database URL plus API key to SparkDB's `/api/sdk/*` endpoints. API keys are sent with the `X-Spark-API-Key` header.
