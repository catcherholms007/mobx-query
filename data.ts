export type BasicState<T> =
    | { kind: 'none' }
    | { kind: 'fetching' }
    | { kind: 'fetched'; data: T }
    | { kind: 'error'; error: Error };

export type RemoteData<T> = BasicState<T> | { kind: 'canceled'; error: Error } | { kind: 'refetching'; data: T };
