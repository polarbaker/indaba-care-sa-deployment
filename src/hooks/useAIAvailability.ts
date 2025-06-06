import { useEffect } from 'react';
import { api } from '~/trpc/react';
import { useAIStore } from '~/stores/aiStore';

/**
 * Hook to check AI availability from the server and update the AI store
 * This should be used in the app's root component to initialize the AI availability status
 */
export function useCheckAIAvailability() {
  const { setAIAvailable, setIsCheckingAIAvailability, isCheckingAIAvailability } = useAIStore();
  
  // Use tRPC query to check AI availability
  const { data, isPending, error } = api.getAIAvailability.useQuery(
    undefined, // No input needed
    {
      // Don't refetch on window focus or reconnect - AI availability rarely changes during a session
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // But do retry if it fails
      retry: 3,
      retryDelay: 1000,
      // Handle errors gracefully
      onError: (err) => {
        console.error("Error checking AI availability:", err);
        // If we can't check availability, assume it's not available
        setAIAvailable(false);
        setIsCheckingAIAvailability(false);
      }
    }
  );
  
  // Update the store based on query state
  useEffect(() => {
    setIsCheckingAIAvailability(isPending);
    
    if (data !== undefined) {
      setAIAvailable(data.available);
    }
    
    // If there's an error, assume AI is not available
    if (error) {
      setAIAvailable(false);
    }
  }, [data, isPending, error, setAIAvailable, setIsCheckingAIAvailability]);
  
  return {
    isAIAvailable: data?.available ?? false,
    isCheckingAIAvailability: isPending,
    error
  };
}
