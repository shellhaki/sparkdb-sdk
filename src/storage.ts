import type { BucketObject, StorageBucket, UploadInput } from './types.js';

type Caller = {
  call<T>(method: string, path: string, init?: { json?: unknown; body?: BodyInit }): Promise<T>;
};

/**
 * Object storage (Spark Bucket).
 *
 *   await db.storage.createBucket('avatars', { public: true });
 *   await db.storage.bucket('avatars').upload(file);
 *   const files = await db.storage.bucket('avatars').list();
 */
export class Storage {
  private readonly spark: Caller;

  constructor(spark: Caller) {
    this.spark = spark;
  }

  /** Create a bucket. Public buckets serve files at a shareable URL. */
  async createBucket(name: string, options: { public?: boolean } = {}): Promise<StorageBucket> {
    return this.spark.call<StorageBucket>('POST', '/api/sdk/buckets', {
      json: { name, public: options.public ?? true }
    });
  }

  /** List your buckets. */
  async listBuckets(): Promise<StorageBucket[]> {
    const res = await this.spark.call<{ buckets: StorageBucket[] }>('GET', '/api/sdk/buckets');
    return res.buckets ?? [];
  }

  /** Get a handle to a bucket by numeric id or by name. */
  bucket(idOrName: number | string): BucketHandle {
    return new BucketHandle(this.spark, this, idOrName);
  }

  async deleteBucket(id: number): Promise<void> {
    await this.spark.call('DELETE', `/api/sdk/buckets/${id}`);
  }

  /** Delete a single object by its id. */
  async deleteObject(id: number): Promise<void> {
    await this.spark.call('DELETE', `/api/sdk/objects/${id}`);
  }
}

/** Operations scoped to one bucket. A string handle is resolved to its id lazily. */
export class BucketHandle {
  private readonly spark: Caller;
  private readonly storage: Storage;
  private readonly idOrName: number | string;

  constructor(spark: Caller, storage: Storage, idOrName: number | string) {
    this.spark = spark;
    this.storage = storage;
    this.idOrName = idOrName;
  }

  private async resolveId(): Promise<number> {
    if (typeof this.idOrName === 'number') return this.idOrName;
    const buckets = await this.storage.listBuckets();
    const match = buckets.find((bucket) => bucket.name === this.idOrName);
    if (!match) throw new Error(`SparkDB bucket "${this.idOrName}" not found.`);
    return match.id;
  }

  /**
   * Upload a file. Accepts a web `Blob`/`File`, or an object with raw bytes:
   *   upload({ data: buffer, filename: 'photo.png', contentType: 'image/png' })
   */
  async upload(input: UploadInput): Promise<BucketObject> {
    const id = await this.resolveId();
    return this.spark.call<BucketObject>('POST', `/api/sdk/buckets/${id}/upload`, { body: toFormData(input) });
  }

  /** List the files in this bucket. */
  async list(): Promise<BucketObject[]> {
    const id = await this.resolveId();
    const res = await this.spark.call<{ objects: BucketObject[] }>('GET', `/api/sdk/buckets/${id}/objects`);
    return res.objects ?? [];
  }

  /** Delete this bucket and everything in it. */
  async delete(): Promise<void> {
    await this.storage.deleteBucket(await this.resolveId());
  }
}

function toFormData(input: UploadInput): FormData {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('File uploads require a runtime with global FormData and Blob (Node 18+ or the browser).');
  }

  const form = new FormData();
  if (input instanceof Blob) {
    const filename = 'name' in input && typeof (input as { name?: unknown }).name === 'string' ? (input as { name: string }).name : 'file';
    form.append('file', input, filename);
    return form;
  }

  const { data, filename, contentType } = input;
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], contentType ? { type: contentType } : undefined);
  form.append('file', blob, filename);
  return form;
}
