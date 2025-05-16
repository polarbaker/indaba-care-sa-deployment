import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

interface NotificationSettings {
  inAppMessages: boolean;
  inAppObservations: boolean;
  inAppApprovals: boolean;
  inAppEmergencies: boolean;
  emailMessages: boolean;
  emailObservations: boolean;
  emailApprovals: boolean;
  emailEmergencies: boolean;
  smsMessages: boolean;
  smsObservations: boolean;
  smsApprovals: boolean;
  smsEmergencies: boolean;
}

interface NotificationSettingsProps {
  initialSettings?: Partial<NotificationSettings>;
  onSettingsUpdated?: (settings: NotificationSettings) => void;
}

export function NotificationSettings({
  initialSettings,
  onSettingsUpdated,
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    inAppMessages: true,
    inAppObservations: true,
    inAppApprovals: true,
    inAppEmergencies: true,
    emailMessages: false,
    emailObservations: false,
    emailApprovals: true,
    emailEmergencies: true,
    smsMessages: false,
    smsObservations: false,
    smsApprovals: false,
    smsEmergencies: true,
    ...initialSettings,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { token, user } = useAuthStore(); // user from authStore might have stale notificationSettings
  const { isOnline, addOperation } = useSyncStore();
  const { isOnline: networkIsOnline } = useNetworkStatus();
  const utils = api.useUtils();

  // Fetch current user data to get the latest notification settings
  const { data: userData, isLoading: isLoadingUserSettings, refetch: refetchUserSettings } = api.getMe.useQuery(
    { token: token! },
    { 
      enabled: !!token && networkIsOnline,
      onSuccess: (data) => {
        if (data?.notificationSettings) {
          setSettings(prev => ({ ...prev, ...data.notificationSettings }));
          setIsDirty(false);
        }
      }
    }
  );
  
  // Reset dirty state when initial settings change from fetched data
  useEffect(() => {
    if (userData?.notificationSettings) {
      setSettings(prev => ({
        ...prev, // Keep defaults for any missing fields
        ...userData.notificationSettings,
      }));
      setIsDirty(false);
    }
  }, [userData?.notificationSettings]);
  
  const updateNotificationSettingsMutation = api.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success("Notification settings updated");
      setIsSaving(false);
      setIsDirty(false);
      
      // Refetch user data to update the UI with latest settings
      void refetchUserSettings(); 
      void utils.getMe.invalidate(); // Ensure other parts of app using getMe are updated

      if (onSettingsUpdated) {
        onSettingsUpdated(settings);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update notification settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setIsDirty(true);
      return updated;
    });
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateNotificationSettingsMutation.mutate({
        token: token!,
        settings,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "UserNotificationSettings",
          recordId: "current", // This will be replaced with the actual ID in the sync operation
          data: settings,
        });
        
        toast.success("Notification settings saved for syncing when back online");
        setIsSaving(false);
        setIsDirty(false);
        
        if (onSettingsUpdated) {
          onSettingsUpdated(settings);
        }
      } catch (error) {
        toast.error("Failed to save notification settings offline");
        setIsSaving(false);
      }
    }
  };
  
  // Check if any channel is completely disabled
  const isInAppDisabled = !settings.inAppMessages && !settings.inAppObservations && 
                          !settings.inAppApprovals && !settings.inAppEmergencies;
  
  const isEmailDisabled = !settings.emailMessages && !settings.emailObservations && 
                          !settings.emailApprovals && !settings.emailEmergencies;
  
  const isSmsDisabled = !settings.smsMessages && !settings.smsObservations && 
                        !settings.smsApprovals && !settings.smsEmergencies;
  
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
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose how and when you'd like to be notified.
        </p>
      </div>
      
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event Type
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                In-App
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                SMS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Messages */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Messages
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.inAppMessages}
                  onChange={() => handleToggle("inAppMessages")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.emailMessages}
                  onChange={() => handleToggle("emailMessages")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.smsMessages}
                  onChange={() => handleToggle("smsMessages")}
                  disabled={!networkIsOnline}
                />
              </td>
            </tr>
            
            {/* Observations */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Observations
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.inAppObservations}
                  onChange={() => handleToggle("inAppObservations")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.emailObservations}
                  onChange={() => handleToggle("emailObservations")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.smsObservations}
                  onChange={() => handleToggle("smsObservations")}
                  disabled={!networkIsOnline}
                />
              </td>
            </tr>
            
            {/* Approvals */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Approvals
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.inAppApprovals}
                  onChange={() => handleToggle("inAppApprovals")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.emailApprovals}
                  onChange={() => handleToggle("emailApprovals")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.smsApprovals}
                  onChange={() => handleToggle("smsApprovals")}
                  disabled={!networkIsOnline}
                />
              </td>
            </tr>
            
            {/* Emergencies */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Emergencies
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.inAppEmergencies}
                  onChange={() => handleToggle("inAppEmergencies")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.emailEmergencies}
                  onChange={() => handleToggle("emailEmergencies")}
                  disabled={!networkIsOnline}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Switch
                  enabled={settings.smsEmergencies}
                  onChange={() => handleToggle("smsEmergencies")}
                  disabled={!networkIsOnline}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Warnings for disabled channels */}
      <div className="space-y-2">
        {isInAppDisabled && (
          <div className="text-sm text-amber-600 flex items-start">
            <svg className="h-5 w-5 text-amber-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You've turned off all in-app notifications. You may miss important updates in the app.</span>
          </div>
        )}
        
        {isEmailDisabled && (
          <div className="text-sm text-amber-600 flex items-start">
            <svg className="h-5 w-5 text-amber-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You've turned off all email notifications. You won't receive any updates by email.</span>
          </div>
        )}
        
        {isSmsDisabled && (
          <div className="text-sm text-amber-600 flex items-start">
            <svg className="h-5 w-5 text-amber-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You've turned off all SMS notifications. You won't receive any text message alerts, including emergencies.</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isDirty || (!networkIsOnline && !isDirty)} // if offline, only allow save if dirty (new changes)
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}

// Toggle switch component
function Switch({ enabled, onChange, disabled = false }: { 
  enabled: boolean; 
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      role="switch"
      aria-checked={enabled}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
    >
      <span className="sr-only">Toggle notification</span>
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
      >
        <span
          className={`${
            enabled
              ? 'opacity-0 ease-out duration-100'
              : 'opacity-100 ease-in duration-200'
          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
          aria-hidden="true"
        >
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
            <path
              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          className={`${
            enabled
              ? 'opacity-100 ease-in duration-200'
              : 'opacity-0 ease-out duration-100'
          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
          aria-hidden="true"
        >
          <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
