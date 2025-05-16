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
const securitySchema = z.object({
  passwordMinLength: z.number().min(8, "Minimum length must be at least 8").max(64),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSymbols: z.boolean(),
  passwordExpiryDays: z.number().min(0).max(365),
  sessionTimeoutMinutes: z.number().min(5).max(1440),
  maxConcurrentSessions: z.number().min(1).max(10),
  auditLoggingEnabled: z.boolean(),
  logRetentionDays: z.number().min(30).max(365),
  detailedLogging: z.boolean(),
});

type SecurityFormValues = z.infer<typeof securitySchema>;

interface SecurityComplianceProps {
  initialConfig?: Partial<SecurityFormValues>;
  onConfigUpdated?: (config: SecurityFormValues) => void;
}

export function SecurityCompliance({ initialConfig, onConfigUpdated }: SecurityComplianceProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingLogs, setIsDownloadingLogs] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      passwordMinLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      passwordExpiryDays: 90,
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 3,
      auditLoggingEnabled: true,
      logRetentionDays: 90,
      detailedLogging: false,
      ...initialConfig,
    },
  });
  
  // Watch values for conditional rendering
  const auditLoggingEnabled = watch("auditLoggingEnabled");
  
  // Update security settings mutation
  const updateSecuritySettingsMutation = api.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("Security settings updated successfully");
      setIsSaving(false);
      if (onConfigUpdated) {
        onConfigUpdated(data.config.security);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update security settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  // Download logs mutation
  const downloadLogsMutation = api.downloadAuditLogs.useMutation({
    onSuccess: (data) => {
      // In a real app, this would trigger a file download
      toast.success("Audit logs download initiated");
      setIsDownloadingLogs(false);
      
      // Simulate a file download
      const element = document.createElement("a");
      const file = new Blob([JSON.stringify(data.logs, null, 2)], { type: "application/json" });
      element.href = URL.createObjectURL(file);
      element.download = "audit-logs.json";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    onError: (error) => {
      toast.error(`Failed to download audit logs: ${error.message}`);
      setIsDownloadingLogs(false);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: SecurityFormValues) => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateSecuritySettingsMutation.mutate({
        token: token!,
        settings: {
          security: data,
        },
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "SystemSettings",
          recordId: "security",
          data,
        });
        
        toast.success("Security settings saved for syncing when back online");
        setIsSaving(false);
        
        if (onConfigUpdated) {
          onConfigUpdated(data);
        }
      } catch (error) {
        toast.error("Failed to save security settings offline");
        setIsSaving(false);
      }
    }
  };
  
  // Handle log download
  const handleDownloadLogs = () => {
    if (!isOnline) {
      toast.error("Cannot download logs while offline");
      return;
    }
    
    setIsDownloadingLogs(true);
    downloadLogsMutation.mutate({ token: token! });
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Password Policy Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Password Policy</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure password requirements for all users.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  label="Minimum Length"
                  {...register("passwordMinLength", { valueAsNumber: true })}
                  error={errors.passwordMinLength?.message}
                />
              </div>
              
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  label="Password Expiry (Days)"
                  {...register("passwordExpiryDays", { valueAsNumber: true })}
                  error={errors.passwordExpiryDays?.message}
                  helperText="0 for no expiration"
                />
              </div>
              
              <div className="sm:col-span-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="requireUppercase"
                      type="checkbox"
                      {...register("requireUppercase")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="requireUppercase" className="font-medium text-gray-700">
                      Require uppercase letters
                    </label>
                    <p className="text-gray-500">At least one uppercase letter (A-Z)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="requireLowercase"
                      type="checkbox"
                      {...register("requireLowercase")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="requireLowercase" className="font-medium text-gray-700">
                      Require lowercase letters
                    </label>
                    <p className="text-gray-500">At least one lowercase letter (a-z)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="requireNumbers"
                      type="checkbox"
                      {...register("requireNumbers")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="requireNumbers" className="font-medium text-gray-700">
                      Require numbers
                    </label>
                    <p className="text-gray-500">At least one number (0-9)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="requireSymbols"
                      type="checkbox"
                      {...register("requireSymbols")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="requireSymbols" className="font-medium text-gray-700">
                      Require symbols
                    </label>
                    <p className="text-gray-500">At least one special character (!@#$%^&*)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Session Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Session Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure session timeout and concurrent session limits.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Session Timeout (Minutes)"
                  {...register("sessionTimeoutMinutes", { valueAsNumber: true })}
                  error={errors.sessionTimeoutMinutes?.message}
                />
              </div>
              
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  label="Max Concurrent Sessions"
                  {...register("maxConcurrentSessions", { valueAsNumber: true })}
                  error={errors.maxConcurrentSessions?.message}
                />
              </div>
            </div>
          </div>
          
          {/* Audit Logging Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Audit Logging</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure audit logging settings for compliance and security monitoring.
            </p>
            
            <div className="mt-6 space-y-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="auditLoggingEnabled"
                    type="checkbox"
                    {...register("auditLoggingEnabled")}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="auditLoggingEnabled" className="font-medium text-gray-700">
                    Enable Audit Logging
                  </label>
                  <p className="text-gray-500">Track user actions and system events</p>
                </div>
              </div>
              
              {auditLoggingEnabled && (
                <>
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="detailedLogging"
                        type="checkbox"
                        {...register("detailedLogging")}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="detailedLogging" className="font-medium text-gray-700">
                        Enable Detailed Logging
                      </label>
                      <p className="text-gray-500">Log detailed information including IP addresses, user agents, and request parameters</p>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      type="number"
                      label="Log Retention Period (Days)"
                      {...register("logRetentionDays", { valueAsNumber: true })}
                      error={errors.logRetentionDays?.message}
                    />
                  </div>
                  
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadLogs}
                      isLoading={isDownloadingLogs}
                      disabled={!isOnline}
                    >
                      <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Audit Logs
                    </Button>
                  </div>
                </>
              )}
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
