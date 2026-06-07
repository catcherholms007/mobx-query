import { safeStringify } from './string';

export function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }
    if (isPrimitive(error)) {
        return new Error(String(error));
    }
    if (typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            return new Error(error.message);
        }
        const serialized = safeStringify(error);
        return new Error(serialized);
    }
    if (typeof error === 'symbol') {
        return new Error(`Symbol thrown: ${error.toString()}`);
    }
    if (typeof error === 'function') {
        return new Error(`Function thrown: ${error.name || 'anonymous'}`);
    }
    if (error instanceof AggregateError) {
        const messages = error.errors.map((e) => normalizeError(e).message);
        return new Error(`AggregateError: ${messages.join(', ')}`);
    }

    return new Error(`Unknown thrown value: ${String(error)}`);
}

function isPrimitive(value: unknown): value is undefined | null | string | number | boolean | bigint {
    return (
        value === undefined ||
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    );
}
