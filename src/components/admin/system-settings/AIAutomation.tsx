import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useAIStore } from "~/stores/aiStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Define validation schema
const aiSettingsSchema = z.object({
  openAI: z.object({
    enabled: z.boolean(),
    apiKey: z.string().min(1, "API key is required").optional().or(z.literal("")),
    model: z.string().default("gpt-4"),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(100).max(16000),
  }),
  features: z.object({
    autoTagging: z.boolean(),
    messageSummarization: z.boolean(),
    contentGeneration: z.boolean(),
    chatAssistant: z.boolean(),
    emergencyDetection: z.boolean(),
  }),
  limits: z.object({
    maxDailyApiCalls: z.number().min(1).max(10000),
    maxDailyApiCallsPerUser: z.number().min(1).max(1000),
    maxSummaryWords: z.number().min(50).max(1000),
    maxResponseTokens: z.number().min(100).max(8000),
  }),
});

type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

interface AIAutomationProps {
  initialConfig?: Partial<AISettingsFormValues>;
  onConfigUpdated?: (config: AISettingsFormValues) => void;
}

export function AIAutomation({ initialConfig, onConfigUpdated }: AIAutomationProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isAIAvailable } = useAIStore();
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      openAI: {
        enabled: isAIAvailable,
        apiKey: "",
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
      },
      features: {
        autoTagging: true,
        messageSummarization: true,
        contentGeneration: true,
        chatAssistant: true,
        emergencyDetection: true,
      },
      limits: {
        maxDailyApiCalls: 1000,
        maxDailyApiCallsPerUser: 100,
        maxSummaryWords: 200,
        maxResponseTokens: 2000,
      },
      ...initialConfig,
    },
  });
  
  // Watch values for conditional rendering
  const aiEnabled = watch("openAI.enabled");
  
  // Update AI settings mutation
  const updateAISettingsMutation = api.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("AI settings updated successfully");
      setIsSaving(false);
      if (onConfigUpdated) {
        onConfigUpdated(data.config.ai);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update AI settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  // Test AI connection mutation
  const testAIConnectionMutation = api.testAIConnection.useMutation({
    onSuccess: () => {
      toast.success("AI connection test successful");
      setIsTestingConnection(false);
    },
    onError: (error) => {
      toast.error(`AI connection test failed: ${error.message}`);
      setIsTestingConnection(false);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: AISettingsFormValues) => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateAISettingsMutation.mutate({
        token: token!,
        settings: {
          ai: data,
        },
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "SystemSettings",
          recordId: "ai",
          data,
        });
        
        toast.success("AI settings saved for syncing when back online");
        setIsSaving(false);
        
        if (onConfigUpdated) {
          onConfigUpdated(data);
        }
      } catch (error) {
        toast.error("Failed to save AI settings offline");
        setIsSaving(false);
      }
    }
  };
  
  // Handle test connection
  const handleTestConnection = () => {
    if (!isOnline) {
      toast.error("Cannot test connection while offline");
      return;
    }
    
    const apiKey = watch("openAI.apiKey");
    if (!apiKey) {
      toast.error("API key is required to test connection");
      return;
    }
    
    setIsTestingConnection(true);
    testAIConnectionMutation.mutate({
      token: token!,
      provider: "openai",
      apiKey,
    });
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* OpenAI Configuration Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Model & API Keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure AI provider settings for the platform.
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="aiEnabled"
                    type="checkbox"
                    {...register("openAI.enabled")}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="aiEnabled" className="font-medium text-gray-700">
                    Enable AI Features
                  </label>
                  <p className="text-gray-500">
                    Turn on AI-powered features across the platform
                  </p>
                </div>
              </div>
              
              {aiEnabled && (
                <div className="space-y-4">
                  <div>
                    <Input
                      type="password"
                      label="OpenAI API Key"
                      {...register("openAI.apiKey")}
                      error={errors.openAI?.apiKey?.message}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700">
                        AI Model
                      </label>
                      <select
                        id="aiModel"
                        {...register("openAI.model")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    </div>
                    
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        isLoading={isTestingConnection}
                        disabled={!isOnline || !watch("openAI.apiKey")}
                        className="mt-7"
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                        Temperature: {watch("openAI.temperature")}
                      </label>
                      <input
                        type="range"
                        id="temperature"
                        min="0"
                        max="2"
                        step="0.1"
                        {...register("openAI.temperature", { valueAsNumber: true })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Controls randomness: 0 is deterministic, 2 is very random
                      </p>
                    </div>
                    
                    <div>
                      <Input
                        type="number"
                        label="Max Tokens"
                        {...register("openAI.maxTokens", { valueAsNumber: true })}
                        error={errors.openAI?.maxTokens?.message}
                        helperText="Maximum tokens per API call"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Feature Flags Section */}
          {aiEnabled && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Feature Flags</h3>
              <p className="mt-1 text-sm text-gray-500">
                Enable or disable specific AI features.
              </p>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="autoTagging"
                      type="checkbox"
                      {...register("features.autoTagging")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="autoTagging" className="font-medium text-gray-700">
                      Auto-Tagging
                    </label>
                    <p className="text-gray-500">
                      Automatically generate tags for observations and content
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="messageSummarization"
                      type="checkbox"
                      {...register("features.messageSummarization")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="messageSummarization" className="font-medium text-gray-700">
                      Message Summarization
                    </label>
                    <p className="text-gray-500">
                      Generate summaries of messages and conversations
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="contentGeneration"
                      type="checkbox"
                      {...register("features.contentGeneration")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="contentGeneration" className="font-medium text-gray-700">
                      Content Generation
                    </label>
                    <p className="text-gray-500">
                      Generate content for observations and reports
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="chatAssistant"
                      type="checkbox"
                      {...register("features.chatAssistant")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="chatAssistant" className="font-medium text-gray-700">
                      Chat Assistant
                    </label>
                    <p className="text-gray-500">
                      Enable AI chat assistant for users
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emergencyDetection"
                      type="checkbox"
                      {...register("features.emergencyDetection")}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emergencyDetection" className="font-medium text-gray-700">
                      Emergency Detection
                    </label>
                    <p className="text-gray-500">
                      Use AI to detect potential emergency situations in messages and observations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Usage Limits Section */}
          {aiEnabled && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Usage Limits</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure limits for AI API usage.
              </p>
              
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <Input
                    type="number"
                    label="Max Daily API Calls (Platform)"
                    {...register("limits.maxDailyApiCalls", { valueAsNumber: true })}
                    error={errors.limits?.maxDailyApiCalls?.message}
                  />
                </div>
                
                <div>
                  <Input
                    type="number"
                    label="Max Daily API Calls (Per User)"
                    {...register("limits.maxDailyApiCallsPerUser", { valueAsNumber: true })}
                    error={errors.limits?.maxDailyApiCallsPerUser?.message}
                  />
                </div>
                
                <div>
                  <Input
                    type="number"
                    label="Max Summary Words"
                    {...register("limits.maxSummaryWords", { valueAsNumber: true })}
                    error={errors.limits?.maxSummaryWords?.message}
                  />
                </div>
                
                <div>
                  <Input
                    type="number"
                    label="Max Response Tokens"
                    {...register("limits.maxResponseTokens", { valueAsNumber: true })}
                    error={errors.limits?.maxResponseTokens?.message}
                  />
                </div>
              </div>
            </div>
          )}
          
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
