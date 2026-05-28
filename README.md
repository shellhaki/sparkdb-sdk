# sparkb-sdk

TypeScript SDK and lightweight ORM client for SparkDB.

```ts
import { client } from 'sparkb-sdk';

type User = {
  id: number;
  email: string;
  name: string;
};

const db = new client(process.env.SPARK_DATABASE_URL!, process.env.SPARK_API_KEY!);

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

The SDK sends the database URL plus API key to SparkDB's `/api/sdk/*` endpoints. API keys are sent with the `X-Spark-API-Key` header.
