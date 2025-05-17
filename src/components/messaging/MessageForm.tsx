import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useAIStore } from "~/stores/aiStore";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  childId: z.string().optional(), // Optional reference to a child
  generateSummary: z.boolean().default(false),
  attachmentType: z.enum(["none", "media", "observation", "milestone"]).default("none").optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")), // For media
  attachmentRefId: z.string().optional(), // For observation/milestone ID
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface MessageFormProps {
  recipientId: string;
  onMessageSent?: () => void;
  children?: { id: string; firstName: string; lastName: string }[];
}

export function MessageForm({ recipientId, onMessageSent, children }: MessageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssistanceEnabled, setIsAssistanceEnabled] = useState(false);
  const [assistedContent, setAssistedContent] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isAIAvailable } = useAIStore();
  const { connectionQuality } = useNetworkStatus();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      generateSummary: false,
    },
  });
  
  const sendMessageMutation = api.sendMessage.useMutation({
    onSuccess: () => {
      reset();
      setAssistedContent(null);
      if (onMessageSent) onMessageSent();
      setIsSubmitting(false);
      toast.success("Message sent!", { id: "reply-sent" });
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`, { id: "reply-error" });
      setIsSubmitting(false);
      
      // If we're offline but the error wasn't caught by the isOnline check
      // This could happen if the network disconnected during the request
      if (!isOnline || (error.message && error.message.includes("network"))) {
        toast.error("You appear to be offline. Message will be queued to send later.", {
          id: "offline-reply-queue",
          duration: 5000,
        });
        
        // Trigger the form submission again to queue it
        void handleSubmit(onSubmit)();
      }
    },
  });
  
  const onSubmit = (data: MessageFormValues) => {
    setIsSubmitting(true);
    
    const messageContent = assistedContent || data.content;
    
    if (data.generateSummary && !isAIAvailable) {
      toast.warning("AI summary generation is not available in demo mode. Your message will be sent without a summary.");
      data.generateSummary = false;
    }

    let attachmentData;
    if (data.attachmentType && data.attachmentType !== "none") {
      attachmentData = {
        type: data.attachmentType,
        url: data.attachmentType === "media" ? data.attachmentUrl : undefined,
        refId: (data.attachmentType === "observation" || data.attachmentType === "milestone") ? data.attachmentRefId : undefined,
      };
    }

    if (isOnline) {
      sendMessageMutation.mutate({
        token: token!,
        recipientId,
        content: messageContent,
        childId: data.childId,
        generateSummary: data.generateSummary,
        attachment: attachmentData, // Pass attachment data
      });
    } else {
      try {
        const messageId = crypto.randomUUID();
        addOperation({
          operationType: "CREATE",
          modelName: "Message",
          recordId: messageId,
          data: {
            recipientId,
            content: messageContent,
            childId: data.childId,
            // Attachment data needs to be stringified or handled by sync process
            attachment: attachmentData ? JSON.stringify(attachmentData) : undefined,
          },
        });
        
        toast.success("Message saved for sending when back online", {
          id: "offline-reply-queued",
          icon: '📤',
        });
        reset();
        setAssistedContent(null);
        if (onMessageSent) onMessageSent();
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to save message for offline sending", {
          id: "offline-queue-error",
        });
        setIsSubmitting(false);
      }
    }
  };
  
  const content = watch("content");
  
  // Request AI assistance for message drafting
  const requestAssistance = async () => {
    if (!content || content.trim() === "") {
      toast.error("Please enter some text to get assistance");
      return;
    }
    
    // Check if AI is available using our helper function
    if (!checkAIAvailability("AI message assistance")) {
      return;
    }
    
    setIsAssistanceEnabled(true);
    
    try {
      // This would be an API call to the AI service
      // For now, we'll simulate it with a timeout
      toast.loading("AI is improving your message...", {
        id: "ai-assistance-loading",
      });
      
      // In a real implementation, this would be a call to your AI service
      setTimeout(() => {
        // Simulate AI response
        const improvedText = `${content}\n\nI've noticed that ${content.split(" ").length > 5 ? content.split(" ").slice(0, 5).join(" ") + "..." : content} shows good progress. Let me know if you have any questions!`;
        setAssistedContent(improvedText);
        toast.dismiss("ai-assistance-loading");
        toast.success("AI assistance applied");
      }, 1500);
    } catch (error) {
      toast.error("Failed to get AI assistance");
      setIsAssistanceEnabled(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Message reply form">
      {/* Message input */}
      <div>
        <textarea
          {...register("content")}
          rows={4}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.content ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Type your message..."
          disabled={!!assistedContent}
          aria-invalid={errors.content ? "true" : "false"}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600" role="alert">{errors.content.message}</p>
        )}
        
        {/* AI assisted content */}
        {assistedContent && (
          <div className="mt-2">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center mb-2">
                <span className="text-xs font-medium text-blue-700">AI assisted version</span>
                <button
                  type="button"
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setAssistedContent(null);
                    setIsAssistanceEnabled(false);
                  }}
                >
                  Revert to original
                </button>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{assistedContent}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Attachment options */}
      <div className="mt-2 space-y-2">
        <label className="block text-xs font-medium text-gray-700">Attach (Optional)</label>
        <div className="flex items-center space-x-4">
          <select
            {...register("attachmentType")}
            className="rounded-md border border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              setValue("attachmentType", e.target.value as "none" | "media" | "observation" | "milestone");
              setValue("attachmentUrl", "");
              setValue("attachmentRefId", "");
            }}
            disabled={!isOnline && watch("attachmentType") === "none"}
            aria-label="Attachment type"
          >
            <option value="none">None</option>
            <option value="media">Media (Photo/Video/Audio)</option>
            <option value="observation">Link to Observation</option>
            <option value="milestone">Link to Milestone</option>
          </select>

          {watch("attachmentType") === "media" && (
            <div className="flex-1">
              <input 
                type="file" 
                className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Simulate upload and set URL
                    setIsUploadingAttachment(true);
                    setUploadProgress(0);
                    let progress = 0;
                    const interval = setInterval(() => {
                      progress += 20;
                      setUploadProgress(progress);
                      if (progress >= 100) {
                        clearInterval(interval);
                        setValue("attachmentUrl", `https://storage.example.com/media/${file.name}`);
                        setIsUploadingAttachment(false);
                        toast.success(`${file.name} attached (simulated).`);
                      }
                    }, 200);
                  }
                }}
                disabled={isUploadingAttachment || !isOnline}
                aria-label="Upload media file"
              />
              {isUploadingAttachment && (
                <div className="mt-1" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Uploading: {uploadProgress}%</p>
                </div>
              )}
              {watch("attachmentUrl") && !isUploadingAttachment && (
                <p className="text-xs text-green-600 mt-1">
                  File attached: {watch("attachmentUrl")?.split('/').pop()}
                </p>
              )}
              {!isOnline && (
                <p className="text-xs text-amber-600 mt-1">
                  You're offline. File uploads are unavailable.
                </p>
              )}
            </div>
          )}

          {(watch("attachmentType") === "observation" || watch("attachmentType") === "milestone") && (
            <div className="flex-1">
              <Input
                type="text"
                placeholder={`Enter ${watch("attachmentType")} ID or link`}
                {...register("attachmentRefId")}
                className="py-1 text-sm"
                disabled={!isOnline}
                aria-label={`${watch("attachmentType")} reference`}
              />
              {!isOnline && (
                <p className="text-xs text-amber-600 mt-1">
                  You're offline. {watch("attachmentType")} search is unavailable.
                </p>
              )}
            </div>
          )}
        </div>
        {errors.attachmentUrl && <p className="mt-1 text-sm text-red-600" role="alert">{errors.attachmentUrl.message}</p>}
        {errors.attachmentRefId && <p className="mt-1 text-sm text-red-600" role="alert">{errors.attachmentRefId.message}</p>}
      </div>

      {/* Options */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:space-x-4 space-y-4 sm:space-y-0 pt-2">
        <div className="flex items-center space-x-4">
          {/* AI assistance button - only show if AI is available */}
          {isAIAvailable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestAssistance}
              disabled={!content || isSubmitting || !!assistedContent || !isOnline}
              aria-label="Get AI assistance with message"
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI Assist
            </Button>
          )}
          
          {/* Child selection (if children are provided) */}
          {children && children.length > 0 && (
            <div className="flex items-center space-x-2">
              <select
                {...register("childId")}
                className="rounded-md border border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Related child"
              >
                <option value="">No specific child</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Generate summary option (only visible if a child is selected and AI is available) */}
          {watch("childId") && isAIAvailable && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="generateSummary"
                {...register("generateSummary")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={!isOnline}
                aria-label="Generate AI summary"
              />
              <label
                htmlFor="generateSummary"
                className="ml-2 block text-xs text-gray-700"
              >
                Generate AI summary
              </label>
              {!isOnline && watch("generateSummary") && (
                <span className="text-xs text-amber-600 ml-1">
                  (unavailable offline)
                </span>
              )}
            </div>
          )}
          
          {/* Offline warning */}
          {!isOnline && (
            <div className="text-xs text-amber-600 flex items-center ml-2" role="alert">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Offline</span>
            </div>
          )}
          
          {/* Send button */}
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="ml-auto"
            aria-label={isOnline ? "Send message" : "Queue message for sending when online"}
          >
            {isOnline ? "Send" : "Queue"}
          </Button>
        </div>
      </div>
    </form>
  );
}
