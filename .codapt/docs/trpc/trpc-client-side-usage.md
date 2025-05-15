We can use tRPC procedures via the react-query helpers `api.someQueryProcedure.useQuery` / `api.someMutationProcedure.useMutation`. For query procedures, we can also call them directly via `api.useUtils` -- this is particularly helpful when we want to conditionally fetch.

IMPORTANT: To check if we should show loading state for a given query, we need to use `isPending && isFetching`. This is because `isPending` alone will also be `true` if the query is disabled.

Be extremely careful using `isPending` by itself to avoid erroneously getting stuck in loading states if the query is disabled by the `enabled` property.

IMPORTANT: There is no `onSuccess` or `onError` callback in the `useQuery` hook.

To get the data from a query, use the `data` property.

Example of using a query procedure with react-query:

```
import { api } from "~/trpc/react";

export function MyComponent(...) {
  const bannerQuery = api.getBanner.useQuery({
    // input fields would go here
  }, {
    refetchInterval: 5000, // if we want to refetch every 5 seconds
    // note that onSuccess and onError are no longer allowed here in useQuery
  })

  return (
    <div>
      {bannerQuery.isPending ? "Loading banner..." : bannerQuery.data === undefined ? "Error loading banner" : bannerQuery.data.bannerText}
    </div>
  )
}
```

Example of using a mutation procedure with react-query:

```
import { api } from "~/trpc/react";

export function MyComponent(...) {
  const doSomethingMutation = api.doSomething.useMutation()

  return (
    <div>
      <button onClick={() => doSomethingMutation.mutate({
        // input fields would go here
      })} disabled={doSomethingMutation.isPending}>
        {doSomethingMutation.isPending ? "Doing something..." : "Do something"}
      </button>
    </div>
  )
}
```

To use a mutation inside an async function with `await`, we can use `mutateAsync`:

```
import { api } from "~/trpc/react";

export function MyComponent(...) {
  const doSomethingMutation = api.doSomething.useMutation()

  async function onButtonClick() {
    await doSomethingMutation.mutateAsync({
      // input fields would go here
    })
  }

  return (
    <div>
      <button onClick={onButtonClick} disabled={doSomethingMutation.isPending}>
        {doSomethingMutation.isPending ? "Doing something..." : "Do something"}
      </button>
    </div>
  )
}
```

Mutations can also take callbacks:

```
api.doSomething.useMutation({
  onSuccess: (data) => {
    // ...
  },
  onError: (error) => {
    // ...
  },
})
```

Example of using a query procedure directly via `api.useUtils`:

```
import { api } from "~/trpc/react";

export function MyComponent(...) {
  const apiUtils = api.useUtils();

  async function onSomeEventOrEffect() {
    const result = await apiUtils.getBanner.fetch({
      // input fields would go here
    });
  }
}
```

Note that you can't use a mutation procedure directly via `api.useUtils`, you have to use `api.someMutationProcedure.useMutation`.

When you have a tRPC procedure that is paginated with a `cursor` input parameter (of any time), you can use `useInfiniteQuery`:

```
// ...

export function MyComponent() {
  const myQuery = api.paginatedProcedure.useInfiniteQuery(
    {
      // ...
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialCursor: 1,
    },
  );
  // ...
}
```

IMPORTANT: Similarly to `useQuery`, here is no `onSuccess` or `onError` callback in the `useInfiniteQuery` hook.
