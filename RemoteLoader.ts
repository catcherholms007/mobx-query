import type {
    DefaultError,
    QueryClient,
    QueryKey,
    QueryObserverOptions,
    QueryObserverResult,
} from '@tanstack/query-core';

import { QueryObserver } from '@tanstack/query-core';
import { makeAutoObservable, when } from 'mobx';

export interface RemoteLoader<TData, TError = DefaultError> {
    result: QueryObserverResult<TData, TError>;
    ensureFetched(): Promise<void>;
}

export class RemoteLoaderImpl<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
> implements RemoteLoader<TData, TError> {
    result: QueryObserverResult<TData, TError>;

    observer: QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>;

    constructor(
        private readonly client: QueryClient,
        private options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    ) {
        makeAutoObservable(this, {
            observer: false,
        });

        const defaultedOptions = client.defaultQueryOptions(options);

        this.observer = new QueryObserver(client, defaultedOptions);
        this.result = this.observer.getOptimisticResult(defaultedOptions);
    }

    subscribe() {
        const unsubscribe = this.observer.subscribe((nextResult) => {
            this.setResult(nextResult);
        });

        return unsubscribe;
    }

    async ensureFetched(): Promise<void> {
        const unsubscribe = this.subscribe();
        try {
            await when(() => this.result.isSuccess || this.result.isError, {
                timeout: 30_000,
            });
        } finally {
            unsubscribe();
        }
    }

    setResult(result: QueryObserverResult<TData, TError>) {
        this.result = result;
    }

    setOptions(options: typeof this.options) {
        this.options = options;

        const defaultedOptions = this.client.defaultQueryOptions(options);

        this.observer.setOptions(defaultedOptions);

        this.setResult(this.observer.getOptimisticResult(defaultedOptions));
    }
}