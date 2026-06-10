/** Error thrown when a SparkDB request fails. Carries the HTTP status. */
export class SparkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'SparkError';
        this.status = status;
    }
}
