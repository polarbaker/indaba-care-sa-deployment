import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Define validation schema
const notificationsSchema = z.object({
  globalAlert: z.object({
    enabled: z.boolean(),
    message: z.string().max(500),
    priority: z.enum(["info", "warning", "critical"]).default("info"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  emailProvider: z.object({
    provider: z.enum(["smtp", "sendgrid", "mailchimp", "none"]).default("smtp"),
    smtpHost: z.string().optional(),
    smtpPort: z.string().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    apiKey: z.string().optional(),
    fromEmail: z.string().email().optional(),
    fromName: z.string().optional(),
  }),
  smsProvider: z.object({
    provider: z.enum(["twilio", "vonage", "none"]).default("none"),
    accountSid: z.string().optional(),
    authToken: z.string().optional(),
    fromNumber: z.string().optional(),
  }),
  pushProvider: z.object({
    provider: z.enum(["firebase", "onesignal", "none"]).default("none"),
    apiKey: z.string().optional(),
    appId: z.string().optional(),
  }),
  emergencyKeywords: z.array(
    z.object({
      keyword: z.string().min(1, "Keyword is required"),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    })
  ),
  keywordThreshold: z.number().min(1).max(10),
  autoFlag: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsSchema>;

interface NotificationsIntegrationsProps {
  initialConfig?: Partial<NotificationsFormValues>;
  onConfigUpdated?: (config: NotificationsFormValues) => void;
}

export function NotificationsIntegrations({ initialConfig, onConfigUpdated }: NotificationsIntegrationsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      globalAlert: {
        enabled: false,
        message: "",
        priority: "info",
      },
      emailProvider: {
        provider: "smtp",
        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "",
        fromName: "Indaba Care",
      },
      smsProvider: {
        provider: "none",
        accountSid: "",
        authToken: "",
        fromNumber: "",
      },
      pushProvider: {
        provider: "none",
        apiKey: "",
        appId: "",
      },
      emergencyKeywords: [
        { keyword: "emergency", severity: "critical" },
        { keyword: "urgent", severity: "high" },
        { keyword: "help", severity: "medium" },
      ],
      keywordThreshold: 2,
      autoFlag: true,
      ...initialConfig,
    },
  });
  
  // Set up field array for emergency keywords
  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyKeywords",
  });
  
  // Watch values for conditional rendering
  const globalAlertEnabled = watch("globalAlert.enabled");
  const emailProvider = watch("emailProvider.provider");
  const smsProvider = watch("smsProvider.provider");
  const pushProvider = watch("pushProvider.provider");
  
  // Update notification settings mutation
  const updateNotificationSettingsMutation = api.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("Notification settings updated successfully");
      setIsSaving(false);
      if (onConfigUpdated) {
        onConfigUpdated(data.config.notifications);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update notification settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  // Test connection mutations
  const testEmailConnectionMutation = api.testEmailConnection.useMutation({
    onSuccess: () => {
      toast.success("Email connection test successful");
      setIsTestingEmail(false);
    },
    onError: (error) => {
      toast.error(`Email connection test failed: ${error.message}`);
      setIsTestingEmail(false);
    },
  });
  
  const testSmsConnectionMutation = api.testSmsConnection.useMutation({
    onSuccess: () => {
      toast.success("SMS connection test successful");
      setIsTestingSms(false);
    },
    onError: (error) => {
      toast.error(`SMS connection test failed: ${error.message}`);
      setIsTestingSms(false);
    },
  });
  
  const testPushConnectionMutation = api.testPushConnection.useMutation({
    onSuccess: () => {
      toast.success("Push notification connection test successful");
      setIsTestingPush(false);
    },
    onError: (error) => {
      toast.error(`Push notification connection test failed: ${error.message}`);
      setIsTestingPush(false);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: NotificationsFormValues) => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateNotificationSettingsMutation.mutate({
        token: token!,
        settings: {
          notifications: data,
        },
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "SystemSettings",
          recordId: "notifications",
          data,
        });
        
        toast.success("Notification settings saved for syncing when back online");
        setIsSaving(false);
        
        if (onConfigUpdated) {
          onConfigUpdated(data);
        }
      } catch (error) {
        toast.error("Failed to save notification settings offline");
        setIsSaving(false);
      }
    }
  };
  
  // Handle test connection for email
  const handleTestEmailConnection = () => {
    if (!isOnline) {
      toast.error("Cannot test connection while offline");
      return;
    }
    
    setIsTestingEmail(true);
    const emailSettings = watch("emailProvider");
    
    testEmailConnectionMutation.mutate({
      token: token!,
      provider: emailSettings.provider,
      settings: emailSettings,
    });
  };
  
  // Handle test connection for SMS
  const handleTestSmsConnection = () => {
    if (!isOnline) {
      toast.error("Cannot test connection while offline");
      return;
    }
    
    setIsTestingSms(true);
    const smsSettings = watch("smsProvider");
    
    testSmsConnectionMutation.mutate({
      token: token!,
      provider: smsSettings.provider,
      settings: smsSettings,
    });
  };
  
  // Handle test connection for push notifications
  const handleTestPushConnection = () => {
    if (!isOnline) {
      toast.error("Cannot test connection while offline");
      return;
    }
    
    setIsTestingPush(true);
    const pushSettings = watch("pushProvider");
    
    testPushConnectionMutation.mutate({
      token: token!,
      provider: pushSettings.provider,
      settings: pushSettings,
    });
  };
  
  // Add new keyword
  const handleAddKeyword = () => {
    append({ keyword: "", severity: "medium" });
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Global Alerts Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Global Alerts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure system-wide alerts that will be displayed to all users.
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="globalAlertEnabled"
                    type="checkbox"
                    {...register("globalAlert.enabled")}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="globalAlertEnabled" className="font-medium text-gray-700">
                    Enable Global Alert
                  </label>
                  <p className="text-gray-500">Display a banner message to all users</p>
                </div>
              </div>
              
              {globalAlertEnabled && (
                <>
                  <div>
                    <label htmlFor="globalAlertMessage" className="block text-sm font-medium text-gray-700">
                      Alert Message
                    </label>
                    <textarea
                      id="globalAlertMessage"
                      rows={3}
                      {...register("globalAlert.message")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter a message to display to all users"
                    />
                    {errors.globalAlert?.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.globalAlert.message.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="globalAlertPriority" className="block text-sm font-medium text-gray-700">
                      Priority Level
                    </label>
                    <select
                      id="globalAlertPriority"
                      {...register("globalAlert.priority")}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="globalAlertStartDate" className="block text-sm font-medium text-gray-700">
                        Start Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        id="globalAlertStartDate"
                        {...register("globalAlert.startDate")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="globalAlertEndDate" className="block text-sm font-medium text-gray-700">
                        End Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        id="globalAlertEndDate"
                        {...register("globalAlert.endDate")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Alert Preview</h4>
                    <div className={`p-4 rounded-md ${
                      watch("globalAlert.priority") === "info" 
                        ? "bg-blue-50 border-l-4 border-blue-400 text-blue-700"
                        : watch("globalAlert.priority") === "warning"
                        ? "bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700"
                        : "bg-red-50 border-l-4 border-red-400 text-red-700"
                    }`}>
                      {watch("globalAlert.message") || "Alert message will appear here"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Email Provider Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Email Provider</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure email provider for sending notifications and alerts.
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="emailProvider" className="block text-sm font-medium text-gray-700">
                  Email Provider
                </label>
                <select
                  id="emailProvider"
                  {...register("emailProvider.provider")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="none">None</option>
                  <option value="smtp">SMTP Server</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailchimp">Mailchimp</option>
                </select>
              </div>
              
              {emailProvider === "smtp" && (
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Input
                      label="SMTP Host"
                      {...register("emailProvider.smtpHost")}
                      error={errors.emailProvider?.smtpHost?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      label="SMTP Port"
                      {...register("emailProvider.smtpPort")}
                      error={errors.emailProvider?.smtpPort?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      label="SMTP Username"
                      {...register("emailProvider.smtpUser")}
                      error={errors.emailProvider?.smtpUser?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      type="password"
                      label="SMTP Password"
                      {...register("emailProvider.smtpPassword")}
                      error={errors.emailProvider?.smtpPassword?.message}
                    />
                  </div>
                </div>
              )}
              
              {(emailProvider === "sendgrid" || emailProvider === "mailchimp") && (
                <div>
                  <Input
                    type="password"
                    label="API Key"
                    {...register("emailProvider.apiKey")}
                    error={errors.emailProvider?.apiKey?.message}
                  />
                </div>
              )}
              
              {emailProvider !== "none" && (
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Input
                      label="From Email"
                      {...register("emailProvider.fromEmail")}
                      error={errors.emailProvider?.fromEmail?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      label="From Name"
                      {...register("emailProvider.fromName")}
                      error={errors.emailProvider?.fromName?.message}
                    />
                  </div>
                </div>
              )}
              
              {emailProvider !== "none" && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestEmailConnection}
                    isLoading={isTestingEmail}
                    disabled={!isOnline}
                  >
                    Test Email Connection
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* SMS Provider Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">SMS Provider</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure SMS provider for sending text message notifications.
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="smsProvider" className="block text-sm font-medium text-gray-700">
                  SMS Provider
                </label>
                <select
                  id="smsProvider"
                  {...register("smsProvider.provider")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="none">None</option>
                  <option value="twilio">Twilio</option>
                  <option value="vonage">Vonage</option>
                </select>
              </div>
              
              {smsProvider !== "none" && (
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Input
                      label="Account SID"
                      {...register("smsProvider.accountSid")}
                      error={errors.smsProvider?.accountSid?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      type="password"
                      label="Auth Token"
                      {...register("smsProvider.authToken")}
                      error={errors.smsProvider?.authToken?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      label="From Number"
                      {...register("smsProvider.fromNumber")}
                      error={errors.smsProvider?.fromNumber?.message}
                      placeholder="+15551234567"
                    />
                  </div>
                </div>
              )}
              
              {smsProvider !== "none" && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestSmsConnection}
                    isLoading={isTestingSms}
                    disabled={!isOnline}
                  >
                    Test SMS Connection
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Push Notification Provider Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Push Notification Provider</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure push notification provider for mobile app notifications.
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="pushProvider" className="block text-sm font-medium text-gray-700">
                  Push Provider
                </label>
                <select
                  id="pushProvider"
                  {...register("pushProvider.provider")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="none">None</option>
                  <option value="firebase">Firebase Cloud Messaging</option>
                  <option value="onesignal">OneSignal</option>
                </select>
              </div>
              
              {pushProvider !== "none" && (
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Input
                      type="password"
                      label="API Key"
                      {...register("pushProvider.apiKey")}
                      error={errors.pushProvider?.apiKey?.message}
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Input
                      label="App ID"
                      {...register("pushProvider.appId")}
                      error={errors.pushProvider?.appId?.message}
                    />
                  </div>
                </div>
              )}
              
              {pushProvider !== "none" && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestPushConnection}
                    isLoading={isTestingPush}
                    disabled={!isOnline}
                  >
                    Test Push Connection
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Emergency Keywords Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Emergency Keywords</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure keywords that trigger emergency alerts when used in messages or observations.
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            {...register(`emergencyKeywords.${index}.keyword` as const)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                          {errors.emergencyKeywords?.[index]?.keyword && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.emergencyKeywords[index]?.keyword?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            {...register(`emergencyKeywords.${index}.severity` as const)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddKeyword}
                >
                  Add Keyword
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <Input
                    type="number"
                    label="Keyword Threshold Count"
                    {...register("keywordThreshold", { valueAsNumber: true })}
                    error={errors.keywordThreshold?.message}
                    helperText="Number of keywords required to trigger an alert"
                  />
                </div>
                
                <div className="sm:col-span-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="autoFlag"
                        type="checkbox"
                        {...register("autoFlag")}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="autoFlag" className="font-medium text-gray-700">
                        Auto-flag content
                      </label>
                      <p className="text-gray-500">
                        Automatically flag content containing emergency keywords for review
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
