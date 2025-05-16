import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useAIStore } from "~/stores/aiStore";
import { useObservationDraftStore } from "~/stores/observationDraftStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { showAIUnavailableMessage } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

const observationSchema = z.object({
  childId: z.string().min(1, "Please select a child"),
  type: z.enum(["TEXT", "PHOTO", "VIDEO", "AUDIO", "CHECKLIST", "RICHTEXT"], {
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
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; checked: boolean }[]>([
    { id: crypto.randomUUID(), text: "", checked: false }
  ]);
  
  const { drafts, addDraft, updateDraft, deleteDraft } = useObservationDraftStore();
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
  
  // Checklist item management
  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { id: crypto.randomUUID(), text: "", checked: false }]);
  };
  
  const updateChecklistItem = (id: string, text: string, checked: boolean) => {
    setChecklistItems(
      checklistItems.map(item => (item.id === id ? { ...item, text, checked } : item))
    );
  };
  
  const removeChecklistItem = (id: string) => {
    if (checklistItems.length > 1) {
      setChecklistItems(checklistItems.filter(item => item.id !== id));
    }
  };
  
  // Save draft
  const saveDraft = () => {
    const formValues = watch();
    
    // Format checklist content if needed
    let content = formValues.content;
    if (formValues.type === "CHECKLIST") {
      content = JSON.stringify(checklistItems);
    }
    
    // Add or update draft
    addDraft({
      childId: formValues.childId,
      type: formValues.type,
      content,
      notes: formValues.notes,
      isPermanent: formValues.isPermanent,
      checklistItems: formValues.type === "CHECKLIST" ? checklistItems : undefined,
    });
    
    toast.success("Draft saved successfully");
  };
  
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
          {["TEXT", "RICHTEXT", "CHECKLIST", "PHOTO", "VIDEO", "AUDIO"].map((type) => (
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
                {type === "RICHTEXT" ? "Rich Text" : type.charAt(0) + type.slice(1).toLowerCase()}
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
      
      {/* Checklist UI */}
      {selectedType === "CHECKLIST" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Checklist Items
          </label>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => updateChecklistItem(item.id, item.text, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateChecklistItem(item.id, e.target.value, item.checked)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Checklist item..."
                />
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                  disabled={checklistItems.length <= 1}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Item
          </button>
          
          {/* Hidden field to store checklist data */}
          <input
            type="hidden"
            {...register("content")}
            value={JSON.stringify(checklistItems)}
          />
        </div>
      )}
      
      {/* Rich Text Editor - Placeholder */}
      {selectedType === "RICHTEXT" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rich Text Content
          </label>
          <textarea
            {...register("content")}
            rows={6}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.content ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter rich text content here..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Rich text editor will be integrated here.
          </p>
        </div>
      )}
      
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
      
      {/* Draft saving button */}
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={saveDraft}
        >
          Save as Draft
        </Button>
        
        <Button
          type="submit"
          fullWidth={false}
          isLoading={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Observation"}
        </Button>
      </div>
    </form>
  );
}