import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";

type SyncOperation = {
  id: string;
  operationType: "CREATE" | "UPDATE" | "DELETE";
  modelName: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  errorMessage?: string;
  lastAttempt?: number;
};

interface SyncState {
  pendingOperations: SyncOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncErrors: number;
  
  // Actions
  addOperation: (operation: Omit<SyncOperation, "id" | "timestamp" | "retryCount" | "status" | "errorMessage" | "lastAttempt">) => void;
  removeOperation: (id: string) => void;
  updateOperationStatus: (id: string, status: SyncOperation["status"], errorMessage?: string) => void;
  incrementRetryCount: (id: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (timestamp: number) => void;
  clearSyncedOperations: () => void;
  resetSyncErrors: () => void;
  incrementSyncErrors: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      pendingOperations: [],
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncedAt: null,
      syncErrors: 0,
      
      addOperation: (operation) => set((state) => ({
        pendingOperations: [
          ...state.pendingOperations,
          {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
            status: "pending",
          },
        ],
      })),
      
      removeOperation: (id) => set((state) => ({
        pendingOperations: state.pendingOperations.filter(op => op.id !== id),
      })),
      
      updateOperationStatus: (id, status, errorMessage) => set((state) => ({
        pendingOperations: state.pendingOperations.map(op => 
          op.id === id 
            ? { 
                ...op, 
                status, 
                errorMessage, 
                lastAttempt: Date.now() 
              } 
            : op
        ),
      })),
      
      incrementRetryCount: (id) => set((state) => ({
        pendingOperations: state.pendingOperations.map(op => 
          op.id === id 
            ? { ...op, retryCount: op.retryCount + 1 } 
            : op
        ),
      })),
      
      setOnlineStatus: (isOnline) => set({ isOnline }),
      
      setSyncing: (isSyncing) => set({ isSyncing }),
      
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
      
      clearSyncedOperations: () => set((state) => ({
        pendingOperations: state.pendingOperations.filter(op => op.status !== "syncing"),
      })),
      
      resetSyncErrors: () => set({ syncErrors: 0 }),
      
      incrementSyncErrors: () => set((state) => ({
        syncErrors: state.syncErrors + 1
      })),
    }),
    {
      name: "indaba-sync-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingOperations: state.pendingOperations,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// Setup online/offline listeners with improved retry logic
export function setupSyncListeners() {
  const handleOnline = () => {
    useSyncStore.getState().setOnlineStatus(true);
    void syncPendingOperations();
  };
  
  const handleOffline = () => {
    useSyncStore.getState().setOnlineStatus(false);
  };
  
  // Add event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Set up periodic retry for failed operations
  const retryInterval = setInterval(() => {
    const { isOnline, pendingOperations } = useSyncStore.getState();
    
    if (isOnline && pendingOperations.some(op => op.status === "failed")) {
      // Reset failed operations to pending state for retry
      pendingOperations
        .filter(op => op.status === "failed")
        .forEach(op => {
          // Only retry if last attempt was more than 30 seconds ago
          // and we haven't exceeded max retries (5)
          if (
            op.retryCount < 5 && 
            (!op.lastAttempt || Date.now() - op.lastAttempt > 30000)
          ) {
            useSyncStore.getState().updateOperationStatus(op.id, "pending");
          }
        });
      
      // Attempt to sync again
      void syncPendingOperations();
    }
  }, 60000); // Check every minute
  
  // Initial sync if online
  if (navigator.onLine) {
    void syncPendingOperations();
  }
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(retryInterval);
  };
}

// Sync pending operations with improved error handling and retry logic
async function syncPendingOperations() {
  const { 
    pendingOperations, 
    isSyncing, 
    setSyncing, 
    removeOperation, 
    updateOperationStatus,
    incrementRetryCount,
    setLastSyncedAt,
    resetSyncErrors,
    incrementSyncErrors
  } = useSyncStore.getState();
  
  // Get the authentication token
  const token = useAuthStore.getState().token;
  
  // Don't start syncing if already in progress, no operations to sync, or no token
  if (isSyncing || pendingOperations.length === 0 || !token) return;
  
  setSyncing(true);
  
  try {
    // Sort operations by timestamp (oldest first) and filter only pending ones
    const operationsToSync = [...pendingOperations]
      .filter(op => op.status === "pending")
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (operationsToSync.length === 0) {
      setSyncing(false);
      return;
    }
    
    // Reset sync errors counter at the start of a new sync session
    resetSyncErrors();
    
    // Process operations one by one
    for (const operation of operationsToSync) {
      try {
        // Mark operation as syncing
        updateOperationStatus(operation.id, "syncing");
        
        // Call the appropriate API endpoint with token
        await api.syncOperation.mutate({
          token,
          operationType: operation.operationType,
          modelName: operation.modelName,
          recordId: operation.recordId,
          data: operation.data,
        });
        
        // Remove the operation after successful sync
        removeOperation(operation.id);
        
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Increment retry count
        incrementRetryCount(operation.id);
        
        // Mark as failed with error message
        updateOperationStatus(
          operation.id, 
          "failed", 
          error instanceof Error ? error.message : "Unknown error"
        );
        
        // Increment sync errors counter
        incrementSyncErrors();
        
        // If too many errors, stop syncing for now
        const { syncErrors } = useSyncStore.getState();
        if (syncErrors >= 3) {
          console.warn("Too many sync errors, pausing sync operations");
          break;
        }
      }
    }
    
    // Update last synced timestamp
    setLastSyncedAt(Date.now());
    
  } catch (error) {
    console.error("Error during sync process:", error);
  } finally {
    setSyncing(false);
  }
}
