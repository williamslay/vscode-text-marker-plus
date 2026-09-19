export interface Logger {
    error(...args: string[]): void;
    warn(...args: string[]): void;
}
