import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useAIStore } from "~/stores/aiStore";
import { Button } from "~/components/ui/Button";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  childId: z.string().optional(), // Optional reference to a child
  generateSummary: z.boolean().default(false),
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
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isAIAvailable } = useAIStore();
  
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
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = (data: MessageFormValues) => {
    setIsSubmitting(true);
    
    const messageContent = assistedContent || data.content;
    
    // If summary generation is requested, check AI availability
    if (data.generateSummary && !isAIAvailable) {
      // Don't block sending the message, just warn about summary
      toast.warning("AI summary generation is not available in demo mode. Your message will be sent without a summary.");
      // Continue with sending the message but without summary generation
      data.generateSummary = false;
    }
    
    if (isOnline) {
      // If online, send directly to the server
      sendMessageMutation.mutate({
        token: token!,
        recipientId,
        content: messageContent,
        childId: data.childId,
        generateSummary: data.generateSummary,
      });
    } else {
      // If offline, store in sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "Message",
          recordId: crypto.randomUUID(),
          data: {
            recipientId,
            content: messageContent,
            childId: data.childId,
          },
        });
        
        toast.success("Message saved for sending when back online");
        reset();
        setAssistedContent(null);
        if (onMessageSent) onMessageSent();
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to save message");
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
      toast.loading("AI is improving your message...");
      
      // In a real implementation, this would be a call to your AI service
      setTimeout(() => {
        // Simulate AI response
        const improvedText = `${content}\n\nI've noticed that ${content.split(" ").length > 5 ? content.split(" ").slice(0, 5).join(" ") + "..." : content} shows good progress. Let me know if you have any questions!`;
        setAssistedContent(improvedText);
        toast.dismiss();
        toast.success("AI assistance applied");
      }, 1500);
    } catch (error) {
      toast.error("Failed to get AI assistance");
      setIsAssistanceEnabled(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
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
      
      {/* Options */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:space-x-4 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          {/* AI assistance button - only show if AI is available */}
          {isAIAvailable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestAssistance}
              disabled={!content || isSubmitting || !!assistedContent}
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
              />
              <label
                htmlFor="generateSummary"
                className="ml-2 block text-xs text-gray-700"
              >
                Generate AI summary
              </label>
            </div>
          )}
          
          {/* Send button */}
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="ml-auto"
          >
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}