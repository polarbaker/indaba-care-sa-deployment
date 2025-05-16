import { useCallback } from 'react';
import { useSyncStore } from '~/stores/syncStore';
import { useAuthStore } from '~/stores/authStore';
import toast from 'react-hot-toast';

/**
 * Hook to simplify access to the sync queue functionality
 * Provides methods for adding operations to the sync queue and checking online status
 */
export function useSyncQueue() {
  const { 
    addOperation: addToQueue,
    isOnline,
    pendingOperations
  } = useSyncStore();
  
  const { token } = useAuthStore();
  
  /**
   * Add an operation to the sync queue with improved error handling
   */
  const addOperation = useCallback((operation: {
    operationType: "CREATE" | "UPDATE" | "DELETE";
    modelName: string;
    recordId: string;
    data: Record<string, unknown>;
  }) => {
    try {
      addToQueue(operation);
      return true;
    } catch (error) {
      console.error('Failed to add operation to sync queue:', error);
      toast.error('Failed to save data for offline sync');
      return false;
    }
  }, [addToQueue]);
  
  /**
   * Get pending operations count, optionally filtered by model name
   */
  const getPendingOperationsCount = useCallback((modelName?: string) => {
    if (!modelName) {
      return pendingOperations.length;
    }
    
    return pendingOperations.filter(op => op.modelName === modelName).length;
  }, [pendingOperations]);
  
  /**
   * Check if there are any pending operations, optionally filtered by model name
   */
  const hasPendingOperations = useCallback((modelName?: string) => {
    return getPendingOperationsCount(modelName) > 0;
  }, [getPendingOperationsCount]);
  
  return {
    addOperation,
    isOnline,
    pendingOperations,
    getPendingOperationsCount,
    hasPendingOperations,
    hasAuthToken: !!token
  };
}
