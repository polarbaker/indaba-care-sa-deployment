import {
  Outlet,
  createRootRoute,
  useRouterState,
  Link,
} from "@tanstack/react-router";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "~/stores/authStore";
import { useCheckAIAvailability } from "~/hooks/useAIAvailability";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });
  const { token, isAuthenticated, login, logout, isLoading } = useAuthStore();
  
  // Check AI availability
  useCheckAIAvailability();
  
  // Check if token is valid on app load
  const { data: userData } = api.getMe.useQuery(
    { token: token || "" },
    { 
      enabled: !!token && isAuthenticated,
      retry: false,
      onError: () => {
        // If token is invalid, log out
        logout();
      }
    }
  );
  
  // Set up sync listeners for offline functionality
  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import("~/stores/syncStore").then(({ setupSyncListeners }) => {
      const cleanup = setupSyncListeners();
      return () => cleanup();
    });
  }, []);

  if (isFetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <TRPCReactProvider>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-blue-600">
                    Indaba Care
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center">
                {isAuthenticated ? (
                  <button 
                    onClick={() => logout()}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Log out
                  </button>
                ) : (
                  <div className="flex space-x-4">
                    <Link
                      to="/auth/login/"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/auth/register/"
                      className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-grow">
          <Outlet />
        </main>
        
        <footer className="bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Indaba Care. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      
      <Toaster position="top-right" />
    </TRPCReactProvider>
  );
}