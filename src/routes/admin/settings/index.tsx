import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/settings/")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <DashboardLayout 
      title="System Settings" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">System Configuration</h2>
          <p className="mt-1 text-gray-500">
            Manage general system settings, integrations, and advanced configurations.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-medium text-gray-700">General Settings</h3>
          <p className="text-sm text-gray-500 mt-2">
            Placeholder for general application settings.
          </p>
          {/* Add general settings form here */}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-medium text-gray-700">Notification Settings</h3>
          <p className="text-sm text-gray-500 mt-2">
            Placeholder for configuring system-wide notifications.
          </p>
          {/* Add notification settings form here */}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-medium text-gray-700">Offline Sync Settings</h3>
          <p className="text-sm text-gray-500 mt-2">
            Placeholder for managing offline synchronization parameters.
          </p>
          {/* Add sync settings form here */}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-medium text-gray-700">AI Configuration</h3>
          <p className="text-sm text-gray-500 mt-2">
            Placeholder for managing AI feature settings and API keys.
          </p>
          {/* Add AI settings form here */}
        </div>
      </div>
    </DashboardLayout>
  );
}
