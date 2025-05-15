Here's how you can define a tRPC subscription procedure which can push updated data to the client when state changes:

```
export const someSubscriptionProcedure = baseProcedure
  .input(
    z.object({
      // ...
    }),
  )
  .subscription(async function* ({ input }) {
    while (true) {
      // ...
      yield {
        some: "data",
      };
      // ...
    }
  });
```

Always use async generator functions for subscriptions! Observables are no longer acceptable as tRPC subscriptions.

Here's hwo you can consume it in the React client:

```
// ...

const subscription = api.someSubscriptionProcedure.useSubscription(/* input here if needed */)

// subscription.data will be undefined or the latest data from the query

// ...
```
