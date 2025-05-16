import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

interface SyncSettings {
  mediaCacheSize: number; // in MB
  autoPurgePolicy: number; // in days
  syncOnWifiOnly: boolean;
}

interface SyncSettingsProps {
  initialSettings?: Partial<SyncSettings>;
  onSettingsUpdated?: (settings: SyncSettings) => void;
}

export function SyncSettings({
  initialSettings,
  onSettingsUpdated,
}: SyncSettingsProps) {
  const [settings, setSettings] = useState<SyncSettings>({
    mediaCacheSize: 100, // Default 100 MB
    autoPurgePolicy: 14, // Default 14 days
    syncOnWifiOnly: false,
    ...initialSettings,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { 
    token, 
    user 
  } = useAuthStore(); // user from authStore might have stale settings
  const { 
    isOnline, 
    pendingOperations, 
    lastSyncedAt, // This comes from syncStore, not user settings directly
    syncErrors,
    addOperation: addSyncOperation, // Renamed to avoid conflict
    forceSync, // Added to trigger manual sync
  } = useSyncStore();
  
  const { 
    isOnline: networkIsOnline, 
    connectionType, 
    connectionQuality 
  } = useNetworkStatus();
  const utils = api.useUtils();

  // Fetch current user data to get the latest sync settings
  const { data: userData, isLoading: isLoadingUserSettings, refetch: refetchUserSettings } = api.getMe.useQuery(
    { token: token! },
    { 
      enabled: !!token && networkIsOnline,
      onSuccess: (data) => {
        if (data?.settings) { // UserSettings are nested under 'settings' in User model
          setSettings(prev => ({ ...prev, ...data.settings }));
          setIsDirty(false);
        }
      }
    }
  );
  
  // Reset dirty state when initial settings change from fetched data
  useEffect(() => {
    if (userData?.settings) {
      setSettings(prev => ({
        ...prev, // Keep defaults for any missing fields
        ...userData.settings,
      }));
      setIsDirty(false);
    }
  }, [userData?.settings]);
  
  const updateSyncSettingsMutation = api.updateSyncSettings.useMutation({
    onSuccess: () => {
      toast.success("Sync settings updated");
      setIsSaving(false);
      setIsDirty(false);
      
      // Refetch user data to update the UI with latest settings
      void refetchUserSettings();
      void utils.getMe.invalidate();

      if (onSettingsUpdated) {
        onSettingsUpdated(settings);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update sync settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  const handleMediaCacheSizeChange = (value: number) => {
    setSettings((prev) => ({ ...prev, mediaCacheSize: value }));
    setIsDirty(true);
  };
  
  const handleAutoPurgePolicyChange = (value: number) => {
    setSettings((prev) => ({ ...prev, autoPurgePolicy: value }));
    setIsDirty(true);
  };
  
  const handleSyncOnWifiOnlyChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, syncOnWifiOnly: checked }));
    setIsDirty(true);
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateSyncSettingsMutation.mutate({
        token: token!,
        ...settings,
      });
    } else {
      // If offline, add to sync queue
      try {
        addSyncOperation({ // Use renamed function
          operationType: "UPDATE",
          modelName: "UserSettings",
          recordId: user?.id || "current", // Use user ID if available
          data: settings,
        });
        
        toast.success("Sync settings saved for syncing when back online");
        setIsSaving(false);
        setIsDirty(false);
        
        if (onSettingsUpdated) {
          onSettingsUpdated(settings);
        }
      } catch (error) {
        toast.error("Failed to save sync settings offline");
        setIsSaving(false);
      }
    }
  };
  
  const handleSyncNow = async () => {
    if (!networkIsOnline) {
      toast.error("Cannot sync while offline.");
      return;
    }
    
    // Check if sync is allowed based on settings
    if (settings.syncOnWifiOnly && connectionType !== 'wifi') { // '4g' might not be accurate for Wi-Fi only
      toast.error("Sync is set to Wi-Fi only. Please connect to Wi-Fi to sync.");
      return;
    }
    
    setIsSyncing(true);
    
    try {
      // Use syncStore's forceSync function
      await forceSync(); 
      toast.success("Sync completed successfully");
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Format the last synced date
  const formatLastSyncedDate = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Determine if sync is allowed based on settings and connection
  const isSyncAllowed = !settings.syncOnWifiOnly || connectionType === '4g' || connectionType === 'wifi';
  
  if (networkIsOnline && isLoadingUserSettings) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Offline & Sync Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Control how the app behaves when you're offline and how data is synchronized.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Media Cache Size</h4>
          <p className="text-xs text-gray-500 mt-1">
            Set the maximum amount of space to use for storing media offline.
          </p>
          
          <div className="mt-2">
            <label htmlFor="cache-size" className="block text-sm text-gray-500">
              {settings.mediaCacheSize} MB
            </label>
            <input
              id="cache-size"
              type="range"
              min="50"
              max="1000"
              step="50"
              value={settings.mediaCacheSize}
              onChange={(e) => handleMediaCacheSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>50 MB</span>
              <span>1000 MB</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700">Auto-Purge Policy</h4>
          <p className="text-xs text-gray-500 mt-1">
            Choose how long to retain offline data before it's automatically removed.
          </p>
          
          <div className="mt-4">
            <select
              id="auto-purge"
              value={settings.autoPurgePolicy}
              onChange={(e) => handleAutoPurgePolicyChange(parseInt(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700">Sync Controls</h4>
          <p className="text-xs text-gray-500 mt-1">
            Control when and how data synchronization happens.
          </p>
          
          <div className="mt-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="sync-wifi-only"
                  name="sync-wifi-only"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={settings.syncOnWifiOnly}
                  onChange={(e) => handleSyncOnWifiOnlyChange(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="sync-wifi-only" className="font-medium text-gray-700">
                  Sync on Wi-Fi only
                </label>
                <p className="text-gray-500">
                  Only synchronize data when connected to Wi-Fi to save mobile data.
                </p>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Sync Status</h5>
                  <div className="text-sm text-gray-500 space-y-1 mt-1">
                    <p>Connection: {networkIsOnline ? `Online (${connectionType || 'unknown'})` : 'Offline'}</p>
                    <p>Quality: {connectionQuality}</p>
                    <p>Last synced: {formatLastSyncedDate(lastSyncedAt)}</p>
                    <p>Pending operations: {pendingOperations.length}</p>
                    {syncErrors > 0 && (
                      <p className="text-red-600">Sync errors: {syncErrors}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleSyncNow}
                  isLoading={isSyncing}
                  disabled={!networkIsOnline || pendingOperations.length === 0 || !isSyncAllowed}
                >
                  Sync Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isDirty || (!networkIsOnline && !isDirty)}
        >
          Save Sync Settings
        </Button>
      </div>
    </div>
  );
}
