# MobX Query

A modern MobX-based query management library for handling remote data loading with built-in caching, request deduplication, and error handling.

## Features

- 🎯 **Smart Caching**: Automatically caches fetched data to prevent redundant API calls
- 🔄 **Request Deduplication**: Prevents multiple simultaneous requests for the same data
- ⚡ **Reactive State Management**: Uses MobX observables for automatic UI reactivity
- 🚫 **Request Cancellation**: Built-in support for canceling in-flight requests
- 🛡️ **Robust Error Handling**: Comprehensive error normalization and handling
- 📦 **Type-Safe**: Full TypeScript support with generics for both data and arguments
- 🔌 **Axios Integration**: Works seamlessly with Axios with automatic abort signal support

## Installation

```bash
pnpm install mobx-query
```

## Quick Start

```typescript
import { RemoteLoader, queryCache } from 'mobx-query';
import axios from 'axios';

// Create a loader with caching config
const userLoader = new RemoteLoader(
  {
    queryKey: ['user', '123'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
    refetchInterval: 30 * 1000, // 30 seconds
  },
  async (signal, userId: string) => {
    const response = await axios.get(`/api/users/${userId}`, { signal });
    return response.data;
  },
  (error) => console.error('Failed to fetch user:', error)
);

// Load data
const user = await userLoader.load('123');

// Check state
console.log(userLoader.state); // { kind: 'fetched', data: {...} }
console.log(userLoader.data); // {...}
```

## API

### RemoteLoader

The main class for managing remote data loading.

#### Constructor

```typescript
constructor(
  config: QueryConfig,
  request: (signal: AbortSignal, ...args: Args) => Promise<T>,
  onError?: (error: Error) => void,
  options?: Partial<RemoteLoaderOptions>
)
```

**Parameters**:
- `config`: Cache configuration with `queryKey`, `staleTime`, `gcTime`, and `refetchInterval`
- `request`: Async function that fetches data. Receives an `AbortSignal` for cancellation support
- `onError`: Optional callback invoked when an error occurs (non-canceled requests)
- `options`: Configuration options

#### Methods

**`load(...args: Args): Promise<T | undefined>`**

Loads data from the remote source. Returns cached data if available and `alwaysReload` is not enabled.

```typescript
const data = await userLoader.load('123');
```

**`cancel(): void`**

Cancels the current in-flight request.

```typescript
userLoader.cancel();
```

**`reset(): void`**

Resets all state and cancels any in-flight requests.

```typescript
userLoader.reset();
```

#### Properties

**`state: RemoteData<T>`**

The current loading state. Can be one of:
- `{ kind: 'none' }` - Initial state
- `{ kind: 'fetching' }` - Loading data for the first time
- `{ kind: 'fetched'; data: T }` - Data successfully loaded
- `{ kind: 'refetching'; data: T }` - Reloading data while preserving old data
- `{ kind: 'error'; error: Error }` - Loading failed
- `{ kind: 'canceled'; error: Error }` - Request was canceled

```typescript
if (userLoader.state.kind === 'fetched') {
  console.log(userLoader.state.data);
}
```

**`data: T | undefined`**

Getter that returns the data if successfully fetched or refetching, otherwise `undefined`.

```typescript
const userData = userLoader.data;
```

### Options

#### RemoteLoaderOptions

```typescript
interface RemoteLoaderOptions {
  alwaysReload?: boolean; // Default: false
}
```

**`alwaysReload`**: When enabled, bypasses the cache and always fetches fresh data, even if data was previously fetched.

```typescript
const loader = new RemoteLoader(request, onError, { alwaysReload: true });
```

## State Management

The library manages a complete lifecycle of remote data loading:

```
none → fetching → fetched
                ↓
            refetching
                ↓
            fetched or error/canceled
```

**State Transitions**:
- **none**: Initial state when no data has been loaded
- **fetching**: Actively loading data for the first time
- **fetched**: Data successfully loaded and cached
- **refetching**: Reloading data while preserving the previous data
- **error**: Request failed with an error
- **canceled**: Request was explicitly canceled

## Error Handling

The library includes robust error normalization that handles:
- Standard `Error` instances
- Axios errors and cancellations
- Primitive values thrown as errors
- Objects with `message` property
- Functions and symbols thrown as errors
- `AggregateError` with multiple errors

```typescript
const loader = new RemoteLoader(
  async (signal) => { /* ... */ },
  (error) => {
    console.error('Error:', error.message);
    // Handle error appropriately
  }
);
```

## Request Cancellation

The library automatically manages request cancellation through `AbortController`. When a new `load()` call is made, any previous request is automatically canceled.

```typescript
// Cancel current request manually
userLoader.cancel();

// Or reset everything
userLoader.reset();
```

## Advanced Caching

MobX Query includes a powerful caching system similar to TanStack Query. Every RemoteLoader requires a cache configuration with a unique `queryKey`:

### Query Configuration

```typescript
interface QueryConfig {
  queryKey: QueryKey; // Unique identifier for the query (array of primitives)
  staleTime?: number; // How long data is considered fresh (ms), default: 0
  gcTime?: number; // Garbage collection time - when to remove unused queries (ms), default: 5min
  refetchInterval?: number; // Auto-refetch interval (ms), optional
}
```

### Examples

**Basic caching with stale time:**

```typescript
const todosLoader = new RemoteLoader(
  {
    queryKey: ['todos'],
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache kept for 10 minutes
  },
  async (signal) => {
    const response = await axios.get('/api/todos', { signal });
    return response.data;
  }
);

// First call fetches from API
await todosLoader.load();

// Subsequent calls within staleTime return cached data immediately
await todosLoader.load();
```

**Auto-refetching:**

```typescript
const statusLoader = new RemoteLoader(
  {
    queryKey: ['server', 'status'],
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    gcTime: 5 * 60 * 1000,
  },
  async (signal) => {
    const response = await axios.get('/api/status', { signal });
    return response.data;
  }
);

await statusLoader.load(); // Starts auto-refetch interval
```

**Dynamic query keys with multiple parameters:**

```typescript
const userPostsLoader = new RemoteLoader(
  {
    queryKey: ['user', userId, 'posts', 'page', currentPage],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  async (signal, userId: string, page: number) => {
    const response = await axios.get(
      `/api/users/${userId}/posts?page=${page}`,
      { signal }
    );
    return response.data;
  }
);

await userPostsLoader.load(userId, currentPage);
```

### QueryCache API

For advanced cache management, use the global `queryCache`:

```typescript
import { queryCache } from 'mobx-query';

// Check if data is stale
if (queryCache.isStale(['todos'])) {
  await todosLoader.load();
}

// Get cached data directly
const cachedData = queryCache.get(['todos']);

// Manually delete from cache
queryCache.delete(['todos']);

// Clear entire cache
queryCache.clear();
```

### Custom Cache Instance

You can also create and use your own cache instance:

```typescript
import { QueryCache, RemoteLoader } from 'mobx-query';

const customCache = new QueryCache();

const loader = new RemoteLoader(
  { queryKey: ['todos'] },
  async (signal) => { /* ... */ },
  undefined,
  { cache: customCache }
);
```

## Legacy Caching Behavior

## React Integration Example

```typescript
import { observer } from 'mobx-react-lite';
import { RemoteLoader } from 'mobx-query';
import axios from 'axios';

const userLoader = new RemoteLoader(
  {
    queryKey: ['user'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  async (signal, id: string) => {
    const response = await axios.get(`/api/users/${id}`, { signal });
    return response.data;
  }
);

const UserComponent = observer(({ userId }: { userId: string }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    userLoader.load(userId);
  }, [userId]);

  if (!mounted) return null;

  switch (userLoader.state.kind) {
    case 'fetching':
      return <div>Loading...</div>;
    case 'fetched':
      return <div>User: {userLoader.state.data.name}</div>;
    case 'refetching':
      return <div>Updating... {userLoader.state.data.name}</div>;
    case 'error':
      return <div>Error: {userLoader.state.error.message}</div>;
    case 'canceled':
      return <div>Request canceled</div>;
    default:
      return <div>Not loaded</div>;
  }
});
```

## TypeScript Support

Full generic type support for data and arguments:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const userLoader = new RemoteLoader<User, [string]>(
  async (signal, userId: string) => {
    // Fully typed request
    const response = await axios.get<User>(`/api/users/${userId}`, { signal });
    return response.data;
  }
);

// Type-safe load call
const user = await userLoader.load('123');
// user is typed as User | undefined
```

## Requirements

- Node.js >= 24.15
- pnpm >= 10.28

## Dependencies

- [MobX](https://mobx.js.org/) ^6.0.0
- [Axios](https://axios-http.com/) ^1.6.0

## License

MIT
