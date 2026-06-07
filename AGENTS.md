# MobX Query - Architecture & Agents

This document describes the architectural design and specialized agents within the RemoteLoader system.

## Core Architecture

RemoteLoader implements a multi-agent pattern for handling remote data operations. Each agent is responsible for a specific aspect of the data loading lifecycle.

## Agents

### 🔄 Data Fetching Agent
Manages remote data loading with intelligent caching and request deduplication to prevent redundant network calls.

### 📊 State Management Agent
Handles complete state lifecycle: `none` → `fetching` → `fetched` → `refetching` → `error/canceled`, with automatic MobX reactivity.

### ⚠️ Error Handling Agent
Normalizes diverse error sources (Axios, AbortError, primitives, etc.) and handles error callbacks and state transitions.

### 🚫 Request Lifecycle Agent
Manages `AbortController` for request cancellation and cleanup, ensuring no memory leaks or hanging promises.

## Key Concepts

- **State Preservation**: During refetch operations, existing data is preserved so UIs don't flicker
- **Request Deduplication**: Multiple `load()` calls return the same promise to avoid redundant requests
- **Automatic Cancellation**: Previous requests are automatically aborted when new loads are initiated
- **MobX Integration**: All state changes trigger automatic reactivity via `makeAutoObservable()`
- **Type Safety**: Full TypeScript support for typed data and variadic arguments

## Integration Points

- **MobX**: Automatic observables via `makeAutoObservable()`
- **Axios**: Native `AbortSignal` support for request cancellation
- **TypeScript**: Generic type parameters for data `<T>` and arguments `<Args>`

See [README.md](README.md) for complete API documentation and usage examples.
