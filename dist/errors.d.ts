/** Error thrown when a SparkDB request fails. Carries the HTTP status. */
export declare class SparkError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
