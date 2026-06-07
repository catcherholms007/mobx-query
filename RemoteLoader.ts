import { isCancel } from 'axios';
import { makeAutoObservable } from 'mobx';

import { RemoteData } from './data';
import { normalizeError } from './error';

export interface RemoteLoadable<T, Args extends unknown[] = []> {
    state: RemoteData<T>;
    data?: T;

    load(...args: Args): Promise<T | undefined>;
    cancel(): void;
    reset(): void;
}

interface RemoteLoaderOptions {
    alwaysReload?: boolean;
}

const defaultRemoteLoaderOptions = {
    alwaysReload: false,
};

export class RemoteLoader<T, Args extends unknown[] = []> implements RemoteLoadable<T, Args> {
    state: RemoteData<T> = { kind: 'none' };

    promise: Promise<T | undefined> | null = null;
    abortController = new AbortController();

    options: RemoteLoaderOptions;

    constructor(
        public request: (signal: AbortSignal, ...args: Args) => Promise<T>,
        public onError?: (error: Error) => void,
        options?: Partial<RemoteLoaderOptions>,
    ) {
        this.options = {
            ...defaultRemoteLoaderOptions,
            ...options,
        };

        makeAutoObservable(this);
    }

    async load(...args: Args): Promise<T | undefined> {
        if (!this.options.alwaysReload && this.state.kind === 'fetched') {
            return this.state.data;
        }

        if (!this.options.alwaysReload && this.promise) {
            return this.promise;
        }

        this.abortController.abort();
        this.abortController = new AbortController();

        if (this.state.kind === 'fetched' || this.state.kind === 'refetching') {
            this.setState({
                kind: 'refetching',
                data: this.state.data,
            });
        } else {
            this.setState({ kind: 'fetching' });
        }

        this.promise = this.execute(...args);

        return this.promise;
    }

    get data(): T | undefined {
        if (this.state.kind === 'fetched' || this.state.kind === 'refetching') {
            return this.state.data;
        }

        return undefined;
    }

    async execute(...args: Args): Promise<T | undefined> {
        try {
            const data = await this.request(this.abortController.signal, ...args);

            this.setState({ kind: 'fetched', data });

            return data;
        } catch (error: unknown) {
            const normalizedError = normalizeError(error);

            if (isCancel(normalizedError)) {
                this.setState({
                    kind: 'canceled',
                    error: normalizedError,
                });
            } else {
                this.setState({
                    kind: 'error',
                    error: normalizedError,
                });

                this.onError?.(normalizedError);
            }

            return undefined;
        } finally {
            this.promise = null;
        }
    }

    cancel() {
        this.abortController.abort();
    }

    reset() {
        this.abortController.abort();
        this.promise = null;
        this.setState({ kind: 'none' });
    }

    setState(state: RemoteData<T>) {
        this.state = state;
    }
}
