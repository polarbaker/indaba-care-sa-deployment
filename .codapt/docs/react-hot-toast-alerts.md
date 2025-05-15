We can use `react-hot-toast` version `^2.5.2` to show pop-up alerts (toasts) as in the following example:

```
import toast from "react-hot-toast";

export function MyComponent(...) {
  function onSomeEvent() {
    // success alert
    toast.success("some message");

    // error alert
    toast.success("some error message");

    // we can also tie a toast to a promise, which will have a loading state followed by a success or error state
    toast.promise(
      saveSettings(settings),
      {
        loading: "Saving...",
        success: "Settings saved!",
        error: "Could not save.",
      }
    );
  };

  // ...
}
```

If we use `react-hot-toast`, we also need to add the ``<Toaster />` component to `__root.tsx`.
