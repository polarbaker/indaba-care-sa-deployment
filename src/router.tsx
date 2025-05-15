import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { TRPCReactProvider } from "./trpc/react";

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingComponent: () => <div>Loading...</div>,
    Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
      return <TRPCReactProvider>{children}</TRPCReactProvider>;
    },
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
