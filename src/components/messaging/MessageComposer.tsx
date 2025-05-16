import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useAIStore } from "~/stores/aiStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

// Define validation schema
const messageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  content: z.string().min(1, "Message cannot be empty"),
  childId: z.string().optional(), // Optional reference to a child
  generateSummary: z.boolean().default(false),
  attachmentType: z.enum(["none", "media", "observation", "milestone"]).default("none"),
  attachmentUrl: z.string().url().optional().or(z.literal("")), // For media
  attachmentRefId: z.string().optional(), // For observation/milestone ID
});

type MessageFormValues = z.infer<typeof messageSchema>;

// Define recipient type
interface Recipient {
  id: string;
  name: string;
  role: string;
  profileImageUrl?: string;
}

// Define child type
interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

// Define observation type
interface Observation {
  id: string;
  content: string;
  createdAt: string;
}

// Define milestone type
interface Milestone {
  id: string;
  name: string;
  description: string;
}

interface MessageComposerProps {
  initialRecipient?: Recipient;
  onMessageSent?: () => void;
  children?: Child[];
  floatingButton?: boolean;
  className?: string;
}

export function MessageComposer({
  initialRecipient,
  onMessageSent,
  children = [],
  floatingButton = false,
  className = "",
}: MessageComposerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssistanceEnabled, setIsAssistanceEnabled] = useState(false);
  const [assistedContent, setAssistedContent] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isComposerOpen, setIsComposerOpen] = useState(!floatingButton);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [showRecipientResults, setShowRecipientResults] = useState(false);
  const [observationSearchTerm, setObservationSearchTerm] = useState("");
  const [showObservationResults, setShowObservationResults] = useState(false);
  const [milestoneSearchTerm, setMilestoneSearchTerm] = useState("");
  const [showMilestoneResults, setShowMilestoneResults] = useState(false);
  
  const composerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isAIAvailable } = useAIStore();
  
  // Set up form with default values
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      recipientId: initialRecipient?.id || "",
      content: "",
      generateSummary: false,
      attachmentType: "none",
      attachmentUrl: "",
      attachmentRefId: "",
    },
  });
  
  // Watch form values
  const content = watch("content");
  const attachmentType = watch("attachmentType");
  const recipientId = watch("recipientId");
  
  // Fetch potential recipients
  const {
    data: recipientsData,
    isLoading: isLoadingRecipients,
  } = api.getAvailableRecipients.useQuery(
    { token: token || "", searchTerm: recipientSearchTerm },
    {
      enabled: !!token && showRecipientResults && recipientSearchTerm.length > 0,
      onError: (err) => {
        console.error("Error fetching recipients:", err);
      },
    }
  );
  
  // Fetch observations for linking
  const {
    data: observationsData,
    isLoading: isLoadingObservations,
  } = api.getRecentObservations.useQuery(
    { token: token || "", searchTerm: observationSearchTerm },
    {
      enabled: !!token && showObservationResults && attachmentType === "observation",
      onError: (err) => {
        console.error("Error fetching observations:", err);
      },
    }
  );
  
  // Fetch milestones for linking
  const {
    data: milestonesData,
    isLoading: isLoadingMilestones,
  } = api.getRecentMilestones.useQuery(
    { token: token || "", searchTerm: milestoneSearchTerm },
    {
      enabled: !!token && showMilestoneResults && attachmentType === "milestone",
      onError: (err) => {
        console.error("Error fetching milestones:", err);
      },
    }
  );
  
  // Send message mutation
  const sendMessageMutation = api.sendMessage.useMutation({
    onSuccess: () => {
      reset();
      setAssistedContent(null);
      setIsComposerOpen(false);
      if (onMessageSent) onMessageSent();
      setIsSubmitting(false);
      toast.success("Message sent successfully");
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        composerRef.current &&
        !composerRef.current.contains(event.target as Node)
      ) {
        setShowRecipientResults(false);
        setShowObservationResults(false);
        setShowMilestoneResults(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Handle form submission
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
      // If online, send directly
      sendMessageMutation.mutate({
        token: token!,
        recipientId: data.recipientId,
        content: messageContent,
        childId: data.childId,
        generateSummary: data.generateSummary,
        attachment: attachmentData,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "Message",
          recordId: crypto.randomUUID(),
          data: {
            recipientId: data.recipientId,
            content: messageContent,
            childId: data.childId,
            attachment: attachmentData ? JSON.stringify(attachmentData) : undefined,
          },
        });
        
        toast.success("Message saved for sending when back online");
        reset();
        setAssistedContent(null);
        setIsComposerOpen(false);
        if (onMessageSent) onMessageSent();
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to save message");
        setIsSubmitting(false);
      }
    }
  };
  
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
  
  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate upload progress
      setIsUploadingAttachment(true);
      setUploadProgress(0);
      
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 20;
          if (next >= 100) {
            clearInterval(interval);
            setIsUploadingAttachment(false);
            setValue("attachmentUrl", `https://storage.example.com/media/${file.name}`);
            return 100;
          }
          return next;
        });
      }, 500);
    }
  };
  
  // Handle recipient search
  const handleRecipientSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setRecipientSearchTerm(value);
    setShowRecipientResults(true);
  };
  
  // Handle recipient selection
  const handleSelectRecipient = (recipient: Recipient) => {
    setValue("recipientId", recipient.id);
    setRecipientSearchTerm(recipient.name);
    setShowRecipientResults(false);
    trigger("recipientId");
  };
  
  // Handle observation search
  const handleObservationSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setObservationSearchTerm(value);
    setShowObservationResults(true);
  };
  
  // Handle observation selection
  const handleSelectObservation = (observation: Observation) => {
    setValue("attachmentRefId", observation.id);
    setObservationSearchTerm(observation.content.substring(0, 30) + "...");
    setShowObservationResults(false);
  };
  
  // Handle milestone search
  const handleMilestoneSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMilestoneSearchTerm(value);
    setShowMilestoneResults(true);
  };
  
  // Handle milestone selection
  const handleSelectMilestone = (milestone: Milestone) => {
    setValue("attachmentRefId", milestone.id);
    setMilestoneSearchTerm(milestone.name);
    setShowMilestoneResults(false);
  };
  
  // Render floating button if needed
  if (floatingButton && !isComposerOpen) {
    return (
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={() => setIsComposerOpen(true)}
        aria-label="New Message"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    );
  }
  
  // Render message composer
  return (
    <div 
      className={`bg-white rounded-lg shadow-lg ${className} ${floatingButton ? 'fixed bottom-6 right-6 w-96 z-50' : ''}`}
      ref={composerRef}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">New Message</h3>
          {floatingButton && (
            <button
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setIsComposerOpen(false)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        <div className="space-y-4">
          {/* Recipient field with autocomplete */}
          <div className="relative">
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="text"
              id="recipient"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Search for a recipient..."
              value={recipientSearchTerm}
              onChange={handleRecipientSearch}
              onFocus={() => setShowRecipientResults(true)}
              disabled={!!initialRecipient}
            />
            <input type="hidden" {...register("recipientId")} />
            {errors.recipientId && (
              <p className="mt-1 text-sm text-red-600">{errors.recipientId.message}</p>
            )}
            
            {/* Recipient search results */}
            {showRecipientResults && !initialRecipient && (
              <div 
                className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-auto max-h-60"
                ref={searchResultsRef}
              >
                {isLoadingRecipients ? (
                  <div className="p-2 text-center text-gray-500">Loading...</div>
                ) : recipientsData && recipientsData.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {recipientsData.map((recipient) => (
                      <li
                        key={recipient.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectRecipient(recipient)}
                      >
                        <div className="flex items-center">
                          {recipient.profileImageUrl ? (
                            <img
                              src={recipient.profileImageUrl}
                              alt={recipient.name}
                              className="h-8 w-8 rounded-full mr-2"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              <span className="text-gray-600 text-sm">
                                {recipient.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                            <div className="text-xs text-gray-500">{recipient.role}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-2 text-center text-gray-500">No recipients found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Message content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="content"
              rows={4}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.content
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="Type your message..."
              {...register("content")}
              disabled={!!assistedContent}
            ></textarea>
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
          
          {/* Attachments */}
          <div>
            <label htmlFor="attachmentType" className="block text-sm font-medium text-gray-700">
              Attachment (Optional)
            </label>
            <select
              id="attachmentType"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              {...register("attachmentType")}
            >
              <option value="none">None</option>
              <option value="media">Media (Photo/Video)</option>
              <option value="observation">Link to Observation</option>
              <option value="milestone">Link to Milestone</option>
            </select>
            
            {/* Media upload */}
            {attachmentType === "media" && (
              <div className="mt-2">
                <input
                  type="file"
                  id="media-upload"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isUploadingAttachment}
                />
                <input type="hidden" {...register("attachmentUrl")} />
                
                {isUploadingAttachment && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
                
                {watch("attachmentUrl") && !isUploadingAttachment && (
                  <p className="text-xs text-green-600 mt-1">
                    File attached: {watch("attachmentUrl").split('/').pop()}
                  </p>
                )}
              </div>
            )}
            
            {/* Observation search */}
            {attachmentType === "observation" && (
              <div className="mt-2 relative">
                <input
                  type="text"
                  placeholder="Search for an observation..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={observationSearchTerm}
                  onChange={handleObservationSearch}
                  onFocus={() => setShowObservationResults(true)}
                />
                <input type="hidden" {...register("attachmentRefId")} />
                
                {/* Observation search results */}
                {showObservationResults && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-auto max-h-60">
                    {isLoadingObservations ? (
                      <div className="p-2 text-center text-gray-500">Loading...</div>
                    ) : observationsData && observationsData.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {observationsData.map((observation) => (
                          <li
                            key={observation.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleSelectObservation(observation)}
                          >
                            <div className="text-sm text-gray-900 truncate">{observation.content}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(observation.createdAt).toLocaleDateString()}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-2 text-center text-gray-500">No observations found</div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Milestone search */}
            {attachmentType === "milestone" && (
              <div className="mt-2 relative">
                <input
                  type="text"
                  placeholder="Search for a milestone..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={milestoneSearchTerm}
                  onChange={handleMilestoneSearch}
                  onFocus={() => setShowMilestoneResults(true)}
                />
                <input type="hidden" {...register("attachmentRefId")} />
                
                {/* Milestone search results */}
                {showMilestoneResults && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-auto max-h-60">
                    {isLoadingMilestones ? (
                      <div className="p-2 text-center text-gray-500">Loading...</div>
                    ) : milestonesData && milestonesData.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {milestonesData.map((milestone) => (
                          <li
                            key={milestone.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleSelectMilestone(milestone)}
                          >
                            <div className="text-sm font-medium text-gray-900">{milestone.name}</div>
                            <div className="text-xs text-gray-500 truncate">{milestone.description}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-2 text-center text-gray-500">No milestones found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Child reference and AI options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Child selection */}
            {children.length > 0 && (
              <div>
                <label htmlFor="childId" className="block text-sm font-medium text-gray-700">
                  Related to Child
                </label>
                <select
                  id="childId"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  {...register("childId")}
                >
                  <option value="">None</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* AI summary option */}
            {watch("childId") && isAIAvailable && (
              <div className="flex items-center mt-6">
                <input
                  id="generateSummary"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  {...register("generateSummary")}
                />
                <label htmlFor="generateSummary" className="ml-2 block text-sm text-gray-700">
                  Generate AI summary
                </label>
              </div>
            )}
            
            {/* AI assistance button */}
            {isAIAvailable && (
              <div className="mt-6 ml-auto">
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
              </div>
            )}
          </div>
          
          {/* Offline warning */}
          {!isOnline && (
            <div className="text-sm text-amber-600 flex items-center">
              <svg className="h-5 w-5 text-amber-500 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>You're offline. Message will be sent when you're back online.</span>
            </div>
          )}
          
          {/* Submit button */}
          <div className="flex justify-end">
            {floatingButton && (
              <Button
                type="button"
                variant="secondary"
                className="mr-2"
                onClick={() => setIsComposerOpen(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              Send Message
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
