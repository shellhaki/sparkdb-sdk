# @shellhaki/sparkdb-sdk

The official TypeScript SDK for [SparkDB](https://sparkdb.pro). Connect to your
managed Postgres, MySQL, or MongoDB database with a project URL and an API key.

```bash
npm install @shellhaki/sparkdb-sdk
```

## Workflow

1. **Create your tables/collections in the Editor** (`Dashboard → Editor`) — or
   with `createTable` / `createCollection` below.
2. **Connect from code** with your `database_url` + `apiKey` and start querying.

Both come from your SparkDB dashboard. Keep the API key server-side.

## Relational (Postgres / MySQL)

```ts
import { SparkClient } from '@shellhaki/sparkdb-sdk';

type User = { id: number; email: string; name: string | null };

const db = new SparkClient('postgres', {
  database_url: process.env.SPARK_DATABASE_URL!,
  apiKey: process.env.SPARK_API_KEY!
});

// Create a table (or do this visually in the Editor)
await db.createTable('users', [
  { name: 'id', type: 'serial', primaryKey: true },
  { name: 'email', type: 'text' },
  { name: 'name', type: 'text', nullable: true }
]);

// Insert
await db.from<User>('users').insert({ email: 'ada@sparkdb.pro', name: 'Ada' });

// Read — chainable and immutable
const pros = await db.from<User>('users').where({ name: 'Ada' }).limit(10).select();
const ada = await db.from<User>('users').where({ email: 'ada@sparkdb.pro' }).single();

// Update / delete (filtered by where)
await db.from<User>('users').where({ id: 1 }).update({ name: 'Ada Lovelace' });
await db.from<User>('users').where({ id: 1 }).delete();

// Raw SQL when you need it
const { rows } = await db.query<User>('select id, email from users limit 25');
```

## Documents (MongoDB)

MongoDB speaks documents, not rows — so it gets a document-shaped API via
`collection()`:

```ts
import { MongoDBClient } from '@shellhaki/sparkdb-sdk';

type Event = { _id: string; name: string; meta?: Record<string, unknown> };

const mongo = new MongoDBClient({
  database_url: process.env.MONGO_URL!,
  apiKey: process.env.SPARK_API_KEY!
});

// Optional schema validation; omit the fields for a schemaless collection
await mongo.createCollection('events', [
  { name: 'name', type: 'string', required: true },
  { name: 'meta', type: 'object' }
]);

await mongo.collection<Event>('events').insertOne({ name: 'user.created', meta: { source: 'sdk' } });
await mongo.collection<Event>('events').insertMany([
  { name: 'user.login' },
  { name: 'user.logout' }
]);

const recent = await mongo.collection<Event>('events').find({ name: 'user.created' }, { limit: 50 });
const one = await mongo.collection<Event>('events').findOne({ name: 'user.created' });

await mongo.collection<Event>('events').updateMany({ name: 'user.created' }, { seen: true });
await mongo.collection<Event>('events').deleteMany({ name: 'user.logout' });

// Raw command JSON when you need it
await mongo.query(JSON.stringify({ listCollections: 1 }));
```

## Object storage (Spark Bucket)

Store and serve files. Public buckets get a shareable URL on `files.sparkdb.pro`.

```ts
await db.storage.createBucket('avatars', { public: true });

// Upload a web Blob/File...
const blob = await fetch('https://example.com/cat.png').then((r) => r.blob());
const object = await db.storage.bucket('avatars').upload(blob);
console.log(object.url); // https://files.sparkdb.pro/files/ab12Cd34Ef.png

// ...or raw bytes (Node Buffer/Uint8Array/string)
await db.storage.bucket('avatars').upload({ data: buffer, filename: 'cat.png', contentType: 'image/png' });

const files = await db.storage.bucket('avatars').list();
await db.storage.deleteObject(files[0].id);
await db.storage.bucket('avatars').delete(); // delete the bucket + its files
```

Uploads count against your plan's bucket storage. Prefer numeric ids
(`db.storage.bucket(3)`) in hot paths to skip the name→id lookup.

## Client construction

```ts
import { SparkClient, PostgresClient, MySQLClient, MongoDBClient } from '@shellhaki/sparkdb-sdk';

// Explicit type + credentials
new SparkClient('postgres', { database_url, apiKey });

// Engine shortcuts
new PostgresClient({ database_url, apiKey });
new MySQLClient({ database_url, apiKey });
new MongoDBClient({ database_url, apiKey });

// URL + key (type inferred from the URL scheme)
new SparkClient(databaseUrl, apiKey);
```

`client` is still exported as a lowercase alias for backwards compatibility.

## API

**Client**
- `from<T>(table)` → `TableQuery<T>` (relational)
- `collection<T>(name)` → `CollectionClient<T>` (documents)
- `query<T>(sqlOrCommandJson)` → `QueryResult<T>`
- `createTable(name, columns)` / `createCollection(name, schema?)`
- `dropTable(name)` / `dropCollection(name)`
- `schema()` → `Schema`

**TableQuery** — `where(filter)`, `limit(n)`, `offset(n)`, `select()`, `single()`,
`insert(values)`, `update(values)`, `delete()`

**CollectionClient** — `insertOne(doc)`, `insertMany(docs)`, `find(filter?, { limit, offset })`,
`findOne(filter?)`, `updateMany(filter, values)`, `deleteMany(filter)`

## Errors

Failed requests throw `SparkError` with a `status` (HTTP code) and `message`.

```ts
import { SparkError } from '@shellhaki/sparkdb-sdk';

try {
  await db.from('users').insert({ email: 'dupe@sparkdb.pro' });
} catch (err) {
  if (err instanceof SparkError) console.error(err.status, err.message);
}
```

The SDK calls SparkDB's `/api/sdk/*` endpoints, authenticating with the
`X-Spark-API-Key` header.
