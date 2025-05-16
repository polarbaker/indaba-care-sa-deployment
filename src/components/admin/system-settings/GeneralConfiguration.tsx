import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ImageUploader } from "~/components/settings/ImageUploader";
import toast from "react-hot-toast";

// Define validation schema
const generalConfigSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  defaultTheme: z.enum(["light", "dark", "system"]),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().optional(),
});

type GeneralConfigFormValues = z.infer<typeof generalConfigSchema>;

interface GeneralConfigurationProps {
  initialConfig?: Partial<GeneralConfigFormValues>;
  onConfigUpdated?: (config: GeneralConfigFormValues) => void;
}

export function GeneralConfiguration({ initialConfig, onConfigUpdated }: GeneralConfigurationProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<GeneralConfigFormValues>({
    resolver: zodResolver(generalConfigSchema),
    defaultValues: {
      siteName: "Indaba Care",
      primaryColor: "#3b82f6",
      secondaryColor: "#6366f1",
      accentColor: "#f59e0b",
      defaultTheme: "light",
      maintenanceMode: false,
      maintenanceMessage: "The system is currently undergoing scheduled maintenance. Please check back later.",
      ...initialConfig,
    },
  });
  
  // Watch form values for live preview
  const primaryColor = watch("primaryColor");
  const secondaryColor = watch("secondaryColor");
  const accentColor = watch("accentColor");
  const defaultTheme = watch("defaultTheme");
  const maintenanceMode = watch("maintenanceMode");
  
  // Update system settings mutation
  const updateSystemSettingsMutation = api.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("System settings updated successfully");
      setIsSaving(false);
      if (onConfigUpdated) {
        onConfigUpdated(data.config);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update system settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: GeneralConfigFormValues) => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updateSystemSettingsMutation.mutate({
        token: token!,
        settings: {
          general: data,
        },
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "SystemSettings",
          recordId: "general",
          data,
        });
        
        toast.success("System settings saved for syncing when back online");
        setIsSaving(false);
        
        if (onConfigUpdated) {
          onConfigUpdated(data);
        }
      } catch (error) {
        toast.error("Failed to save system settings offline");
        setIsSaving(false);
      }
    }
  };
  
  // Handle logo upload
  const handleLogoSaved = (imageUrl: string) => {
    setValue("logoUrl", imageUrl, { shouldDirty: true });
  };
  
  // Handle banner upload
  const handleBannerSaved = (imageUrl: string) => {
    setValue("bannerUrl", imageUrl, { shouldDirty: true });
  };
  
  // Handle CSV upload for translations
  const handleTranslationUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // In a real app, we would handle the CSV upload
    // For now, just show a success message
    toast.success(`Translation file "${file.name}" uploaded successfully`);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Branding Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Branding & Theme</h3>
            <p className="mt-1 text-sm text-gray-500">
              Customize the appearance of the platform with your organization's branding.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Input
                  label="Site Name"
                  {...register("siteName")}
                  error={errors.siteName?.message}
                />
              </div>
              
              <div className="sm:col-span-6">
                <ImageUploader
                  imageType="avatar"
                  currentImageUrl={initialConfig?.logoUrl}
                  onImageSaved={handleLogoSaved}
                  aspectRatio={1}
                />
              </div>
              
              <div className="sm:col-span-6">
                <ImageUploader
                  imageType="cover"
                  currentImageUrl={initialConfig?.bannerUrl}
                  onImageSaved={handleBannerSaved}
                  aspectRatio={3}
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="color"
                    id="primaryColor"
                    {...register("primaryColor")}
                    className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    {...register("primaryColor")}
                    className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                {errors.primaryColor && (
                  <p className="mt-1 text-sm text-red-600">{errors.primaryColor.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
                  Secondary Color
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="color"
                    id="secondaryColor"
                    {...register("secondaryColor")}
                    className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    {...register("secondaryColor")}
                    className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                {errors.secondaryColor && (
                  <p className="mt-1 text-sm text-red-600">{errors.secondaryColor.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700">
                  Accent Color
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="color"
                    id="accentColor"
                    {...register("accentColor")}
                    className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    {...register("accentColor")}
                    className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                {errors.accentColor && (
                  <p className="mt-1 text-sm text-red-600">{errors.accentColor.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="defaultTheme" className="block text-sm font-medium text-gray-700">
                  Default Theme
                </label>
                <select
                  id="defaultTheme"
                  {...register("defaultTheme")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Preference</option>
                </select>
                {errors.defaultTheme && (
                  <p className="mt-1 text-sm text-red-600">{errors.defaultTheme.message}</p>
                )}
              </div>
              
              <div className="sm:col-span-6">
                <div className="mt-4 p-4 border border-gray-200 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Theme Preview</h4>
                  <div className={`p-4 rounded-md ${defaultTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex space-x-2">
                      <div
                        className="w-20 h-8 rounded-md flex items-center justify-center text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary
                      </div>
                      <div
                        className="w-20 h-8 rounded-md flex items-center justify-center text-white"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        Secondary
                      </div>
                      <div
                        className="w-20 h-8 rounded-md flex items-center justify-center text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Localization Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Localization</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage languages and translations for the platform.
            </p>
            
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Supported Languages</h4>
                <div className="mt-2 border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">English (US) - Default</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">French (France)</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">Spanish (Spain)</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">German</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700">Upload Translations</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Upload a CSV file with translations for a specific language.
                </p>
                <div className="mt-2 flex items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleTranslationUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >
                  Add Language
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >
                  Remove Language
                </Button>
              </div>
            </div>
          </div>
          
          {/* Maintenance Mode Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Maintenance Mode</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enable maintenance mode to temporarily restrict access to the platform.
            </p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center">
                <input
                  id="maintenanceMode"
                  type="checkbox"
                  {...register("maintenanceMode")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                  Enable Maintenance Mode
                </label>
              </div>
              
              {maintenanceMode && (
                <div>
                  <label htmlFor="maintenanceMessage" className="block text-sm font-medium text-gray-700">
                    Maintenance Message
                  </label>
                  <textarea
                    id="maintenanceMessage"
                    rows={3}
                    {...register("maintenanceMessage")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Enter a message to display to users during maintenance"
                  />
                  {errors.maintenanceMessage && (
                    <p className="mt-1 text-sm text-red-600">{errors.maintenanceMessage.message}</p>
                  )}
                </div>
              )}
              
              {maintenanceMode && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        When maintenance mode is enabled, only admin users will be able to access the platform.
                      </p>
                    </div>
                  </div>
                </div>
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
