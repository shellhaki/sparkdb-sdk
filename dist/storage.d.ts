import type { BucketObject, StorageBucket, UploadInput } from './types.js';
type Caller = {
    call<T>(method: string, path: string, init?: {
        json?: unknown;
        body?: BodyInit;
    }): Promise<T>;
};
/**
 * Object storage (Spark Bucket).
 *
 *   await db.storage.createBucket('avatars', { public: true });
 *   await db.storage.bucket('avatars').upload(file);
 *   const files = await db.storage.bucket('avatars').list();
 */
export declare class Storage {
    private readonly spark;
    constructor(spark: Caller);
    /** Create a bucket. Public buckets serve files at a shareable URL. */
    createBucket(name: string, options?: {
        public?: boolean;
    }): Promise<StorageBucket>;
    /** List your buckets. */
    listBuckets(): Promise<StorageBucket[]>;
    /** Get a handle to a bucket by numeric id or by name. */
    bucket(idOrName: number | string): BucketHandle;
    deleteBucket(id: number): Promise<void>;
    /** Delete a single object by its id. */
    deleteObject(id: number): Promise<void>;
}
/** Operations scoped to one bucket. A string handle is resolved to its id lazily. */
export declare class BucketHandle {
    private readonly spark;
    private readonly storage;
    private readonly idOrName;
    constructor(spark: Caller, storage: Storage, idOrName: number | string);
    private resolveId;
    /**
     * Upload a file. Accepts a web `Blob`/`File`, or an object with raw bytes:
     *   upload({ data: buffer, filename: 'photo.png', contentType: 'image/png' })
     */
    upload(input: UploadInput): Promise<BucketObject>;
    /** List the files in this bucket. */
    list(): Promise<BucketObject[]>;
    /** Delete this bucket and everything in it. */
    delete(): Promise<void>;
}
export {};
