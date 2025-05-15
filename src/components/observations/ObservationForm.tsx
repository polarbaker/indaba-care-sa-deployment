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
import { showAIUnavailableMessage } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

const observationSchema = z.object({
  childId: z.string().min(1, "Please select a child"),
  type: z.enum(["TEXT", "PHOTO", "VIDEO", "AUDIO"], {
    errorMap: () => ({ message: "Please select an observation type" }),
  }),
  content: z.string().min(1, "Observation content is required"),
  notes: z.string().optional(),
  isPermanent: z.boolean().default(true),
});

type ObservationFormValues = z.infer<typeof observationSchema>;

interface ObservationFormProps {
  onSuccess?: () => void;
  children: { id: string; firstName: string; lastName: string }[];
  defaultValues?: Partial<ObservationFormValues>;
}

export function ObservationForm({ onSuccess, children, defaultValues }: ObservationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isAIAvailable } = useAIStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      type: "TEXT",
      isPermanent: true,
      ...defaultValues,
    },
  });
  
  const createObservationMutation = api.createObservation.useMutation({
    onSuccess: () => {
      toast.success("Observation created successfully");
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = (data: ObservationFormValues) => {
    setIsSubmitting(true);
    
    if (isOnline) {
      // If online, send directly to the server
      createObservationMutation.mutate({
        token: token!,
        childId: data.childId,
        type: data.type,
        content: data.content,
        notes: data.notes,
        isPermanent: data.isPermanent,
      });
    } else {
      // If offline, store in sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "Observation",
          recordId: crypto.randomUUID(),
          data: {
            childId: data.childId,
            type: data.type,
            content: data.content,
            notes: data.notes,
            isPermanent: data.isPermanent,
          },
        });
        
        toast.success("Observation saved for syncing when back online");
        reset();
        if (onSuccess) onSuccess();
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to save observation");
        setIsSubmitting(false);
      }
    }
  };
  
  const selectedType = watch("type");
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Child selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Child
        </label>
        <select
          {...register("childId")}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.childId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select a child</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.firstName} {child.lastName}
            </option>
          ))}
        </select>
        {errors.childId && (
          <p className="mt-1 text-sm text-red-600">{errors.childId.message}</p>
        )}
      </div>
      
      {/* Observation type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observation Type
        </label>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["TEXT", "PHOTO", "VIDEO", "AUDIO"].map((type) => (
            <label
              key={type}
              className={`flex items-center justify-center space-x-2 p-3 border rounded-md cursor-pointer ${
                selectedType === type
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                value={type}
                {...register("type")}
                className="sr-only"
              />
              <span
                className={
                  selectedType === type ? "text-blue-700 font-medium" : ""
                }
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </span>
            </label>
          ))}
        </div>
        {errors.type && (
          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>
      
      {/* Content */}
      <div>
        {selectedType === "TEXT" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observation
            </label>
            <textarea
              {...register("content")}
              rows={4}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.content ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Describe what you observed..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedType === "PHOTO"
                ? "Photo Description"
                : selectedType === "VIDEO"
                ? "Video Description"
                : "Audio Description"}
            </label>
            <textarea
              {...register("content")}
              rows={2}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.content ? "border-red-500" : "border-gray-300"
              }`}
              placeholder={`Describe this ${selectedType.toLowerCase()}...`}
            />
            
            {/* Media upload - placeholder for now */}
            <div className="mt-2 p-4 border border-dashed border-gray-300 rounded-md text-center">
              <p className="text-sm text-gray-500">
                Upload {selectedType.toLowerCase()} functionality will be added here
              </p>
            </div>
          </div>
        )}
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>
      
      {/* Private notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Private Notes (only visible to you)
        </label>
        <textarea
          {...register("notes")}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add any private notes here..."
        />
      </div>
      
      {/* AI tag generation notice */}
      {!isAIAvailable && (
        <div className="mt-2 p-2 rounded-md bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-700">
            <svg className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            AI tag generation is not available in demo mode. Basic tags will be applied automatically.
            <button 
              type="button" 
              className="ml-1 text-blue-800 underline"
              onClick={() => showAIUnavailableMessage("AI tag generation")}
            >
              Learn more
            </button>
          </p>
        </div>
      )}
      
      {/* Storage option */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPermanent"
          {...register("isPermanent")}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="isPermanent"
          className="ml-2 block text-sm text-gray-700"
        >
          Store permanently (uncheck for temporary storage)
        </label>
      </div>
      
      {/* Submit button */}
      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Observation"}
      </Button>
    </form>
  );
}