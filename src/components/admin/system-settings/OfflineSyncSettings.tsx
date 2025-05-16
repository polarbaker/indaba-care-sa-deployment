import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Define validation schema
const syncSettingsSchema = z.object({
  syncIntervalMinutes: z.number().min(5).max(1440),
  conflictResolution: z.enum(["lastWriteWins", "manualMerge", "promptUser"]).default("lastWriteWins"),
  maxCacheMB: z.number().min(50).max(1000),
  warnAtPercentage: z.number().min(50).max(95),
  enableBackgroundSync: z.boolean(),
  syncOnWifiOnly: z.boolean(),
  maxSyncRetries: z.number().min(1).max(10),
  syncPriorities: z.object({
    observations: z.number().min(1).max(5),
    messages: z.number().min(1).max(5),
    profiles: z.number().min(1).max(5),
    media: z.number().min(1).max(5),
  }),
});

type SyncSettingsFormValues = z.infer<typeof syncSettingsSchema>;

interface OfflineSyncSettingsProps {
  initialConfig?: Partial<SyncSettingsFormValues>;
  onConfigUpdated?: (config: SyncSettingsFormValues) => void;
}

export function OfflineSyncSettings({ initialConfig, onConfigUpdated }: OfflineSyncSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation, pendingOperations } = useSyncStore();
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<SyncSettingsFormValues>({
    resolver: zodResolver(syncSettingsSchema),
    defaultValues: {
      syncIntervalMinutes: 15,
      conflictResolution: "lastWriteWins",
      maxCacheMB: 200,
      warnAtPercentage: 80,
      enableBackgroundSync: true,
      syncOnWifiOnly: false,
      maxSyncRetries: 3,
      syncPriorities: {
        observations: 1,
        messages: 2,
        profiles: 3,
        media: 4,
      },
      ...initialConfig,
    },
  });
  
  // Update sync settings mutation
  const updateSyncSettingsMutation = api.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("Sync settings updated successfully");
      setIsSaving(false);
      if (onConfigUpdated) {
        onConfigUpdated(data.config.sync);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update sync settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: SyncSettingsFormValues) => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateSyncSettingsMutation.mutate({
        token: token!,
        settings: {
          sync: data,
        },
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "SystemSettings",
          recordId: "sync",
          data,
        });
        
        toast.success("Sync settings saved for syncing when back online");
        setIsSaving(false);
        
        if (onConfigUpdated) {
          onConfigUpdated(data);
        }
      } catch (error) {
        toast.error("Failed to save sync settings offline");
        setIsSaving(false);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Sync Scheduler Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Sync Scheduler</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure how frequently the app syncs data with the server.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Sync Interval (Minutes)"
                  {...register("syncIntervalMinutes", { valueAsNumber: true })}
                  error={errors.syncIntervalMinutes?.message}
                />
              </div>
              
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Max Sync Retries"
                  {...register("maxSyncRetries", { valueAsNumber: true })}
                  error={errors.maxSyncRetries?.message}
                />
              </div>
              
              <div className="sm:col-span-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="enableBackgroundSync"
                      type="checkbox"
                      {...register("enableBackgroundSync")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="enableBackgroundSync" className="font-medium text-gray-700">
                      Enable Background Sync
                    </label>
                    <p className="text-gray-500">Allow the app to sync data in the background</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="syncOnWifiOnly"
                      type="checkbox"
                      {...register("syncOnWifiOnly")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="syncOnWifiOnly" className="font-medium text-gray-700">
                      Sync on Wi-Fi Only
                    </label>
                    <p className="text-gray-500">Only sync when connected to Wi-Fi to save mobile data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Conflict Resolution Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Conflict Resolution</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure how conflicts are resolved when the same data is modified both offline and online.
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="conflictResolution" className="block text-sm font-medium text-gray-700">
                  Default Conflict Resolution Strategy
                </label>
                <select
                  id="conflictResolution"
                  {...register("conflictResolution")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="lastWriteWins">Last Write Wins</option>
                  <option value="manualMerge">Manual Merge</option>
                  <option value="promptUser">Prompt User</option>
                </select>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Strategy Explanation</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Write Wins</dt>
                    <dd className="text-sm text-gray-600">The most recent change overwrites any previous changes.</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Manual Merge</dt>
                    <dd className="text-sm text-gray-600">Conflicts are flagged for admin review and manual resolution.</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Prompt User</dt>
                    <dd className="text-sm text-gray-600">Users are prompted to choose which version to keep when a conflict is detected.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
          
          {/* Sync Priorities Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Sync Priorities</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure the order in which different types of data are synchronized.
            </p>
            
            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-600">
                Set priority from 1 (highest) to 5 (lowest). Higher priority items will be synced first.
              </p>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="syncPriorityObservations" className="block text-sm font-medium text-gray-700">
                    Observations Priority
                  </label>
                  <select
                    id="syncPriorityObservations"
                    {...register("syncPriorities.observations", { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="syncPriorityMessages" className="block text-sm font-medium text-gray-700">
                    Messages Priority
                  </label>
                  <select
                    id="syncPriorityMessages"
                    {...register("syncPriorities.messages", { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="syncPriorityProfiles" className="block text-sm font-medium text-gray-700">
                    Profiles Priority
                  </label>
                  <select
                    id="syncPriorityProfiles"
                    {...register("syncPriorities.profiles", { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="syncPriorityMedia" className="block text-sm font-medium text-gray-700">
                    Media Priority
                  </label>
                  <select
                    id="syncPriorityMedia"
                    {...register("syncPriorities.media", { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={1}>1 - Highest</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5 - Lowest</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Storage Quotas Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Storage Quotas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure storage limits for offline data caching.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Max Cache Size (MB)"
                  {...register("maxCacheMB", { valueAsNumber: true })}
                  error={errors.maxCacheMB?.message}
                />
              </div>
              
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Warning Threshold (%)"
                  {...register("warnAtPercentage", { valueAsNumber: true })}
                  error={errors.warnAtPercentage?.message}
                  helperText="Warn users when cache reaches this percentage of max"
                />
              </div>
            </div>
          </div>
          
          {/* Sync Status Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Sync Status</h3>
            <p className="mt-1 text-sm text-gray-500">
              Current sync status and statistics.
            </p>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Connection Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {isOnline ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Offline
                      </span>
                    )}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Pending Operations</dt>
                  <dd className="mt-1 text-sm text-gray-900">{pendingOperations.length}</dd>
                </div>
                
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Last Sync</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date().toLocaleString()} {/* This would be replaced with actual last sync time */}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="border-t border-gray-200 pt-6 flex justify-end">
            <Button
              type="submit"
              isLoading={isSaving}
              disabled={!isDirty}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
