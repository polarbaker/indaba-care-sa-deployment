import { useState } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { GeneralConfiguration } from "~/components/admin/system-settings/GeneralConfiguration";
import { SecurityCompliance } from "~/components/admin/system-settings/SecurityCompliance";
import { NotificationsIntegrations } from "~/components/admin/system-settings/NotificationsIntegrations";
import { OfflineSyncSettings } from "~/components/admin/system-settings/OfflineSyncSettings";
import { AIAutomation } from "~/components/admin/system-settings/AIAutomation";

type SystemSettingsTab = "general" | "security" | "notifications" | "sync" | "ai";

interface SystemSettingsProps {
  initialTab?: SystemSettingsTab;
}

export function SystemSettings({ initialTab = "general" }: SystemSettingsProps) {
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>(initialTab);
  const { token } = useAuthStore();
  
  // Fetch system settings
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = api.getSystemSettings.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching system settings:", err);
      },
    }
  );
  
  // Handle tab change
  const handleTabChange = (tab: SystemSettingsTab) => {
    setActiveTab(tab);
  };
  
  // Render tab content
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading system settings. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    switch (activeTab) {
      case "general":
        return (
          <GeneralConfiguration
            initialConfig={settings?.general}
            onConfigUpdated={() => refetch()}
          />
        );
      case "security":
        return (
          <SecurityCompliance
            initialConfig={settings?.security}
            onConfigUpdated={() => refetch()}
          />
        );
      case "notifications":
        return (
          <NotificationsIntegrations
            initialConfig={settings?.notifications}
            onConfigUpdated={() => refetch()}
          />
        );
      case "sync":
        return (
          <OfflineSyncSettings
            initialConfig={settings?.sync}
            onConfigUpdated={() => refetch()}
          />
        );
      case "ai":
        return (
          <AIAutomation
            initialConfig={settings?.ai}
            onConfigUpdated={() => refetch()}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Admin-only warning */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              These settings are only accessible to administrators and affect the entire platform.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange("general")}
            className={`${
              activeTab === "general"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            General Configuration
          </button>
          <button
            onClick={() => handleTabChange("security")}
            className={`${
              activeTab === "security"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Security & Compliance
          </button>
          <button
            onClick={() => handleTabChange("notifications")}
            className={`${
              activeTab === "notifications"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Notifications & Integrations
          </button>
          <button
            onClick={() => handleTabChange("sync")}
            className={`${
              activeTab === "sync"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Offline Sync Settings
          </button>
          <button
            onClick={() => handleTabChange("ai")}
            className={`${
              activeTab === "ai"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            AI & Automation
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="bg-white shadow rounded-lg p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
