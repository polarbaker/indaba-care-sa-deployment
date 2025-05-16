import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useAIStore } from "~/stores/aiStore";
import { MessageForm } from "~/components/messaging/MessageForm";
import { Button } from "~/components/ui/Button";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

export function ChatMessaging() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [aiAssistantMode, setAiAssistantMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuthStore();
  const { isAIAvailable } = useAIStore();
  const utils = api.useUtils();
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    error: conversationsError
  } = api.getConversations.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching conversations:", err);
      },
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  // Fetch messages for the selected conversation
  const { 
    data: messagesData, 
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.getMessages.useInfiniteQuery(
    { 
      token: token || "",
      otherUserId: selectedConversation || "",
      limit: 20,
      markAsRead: true
    },
    {
      enabled: !!token && !!selectedConversation,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      onError: (err) => {
        console.error("Error fetching messages:", err);
      },
      refetchInterval: aiAssistantMode ? undefined : 10000 // Refetch every 10 seconds unless in AI mode
    }
  );

  // Fetch assigned children for message context
  const { data: childrenData } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching children:", err);
      }
    }
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesData]);

  // Handle message sent successfully
  const handleMessageSent = () => {
    // Invalidate both queries to refresh the data
    void utils.getMessages.invalidate();
    void utils.getConversations.invalidate();
  };
  
  // Format the date for display
  const formatMessageDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'long' });
    } else {
      return messageDate.toLocaleDateString();
    }
  };
  
  // Toggle AI assistant mode
  const toggleAIAssistant = () => {
    if (!isAIAvailable && !aiAssistantMode) {
      checkAIAvailability("AI assistant");
      return;
    }
    
    setAiAssistantMode(!aiAssistantMode);
    if (!aiAssistantMode) {
      toast.success("AI assistant mode activated. Ask any parenting questions!");
    } else {
      toast.success("AI assistant mode deactivated. Returning to normal messaging.");
    }
  };
  
  // Flatten the messages from all pages
  const messages = messagesData?.pages.flatMap(page => page.data) || [];
  
  // Find the selected conversation details
  const selectedConversationDetails = conversationsData?.find(
    c => c.userId === selectedConversation
  );
  
  // Get unread message count
  const unreadMessageCount = conversationsData 
    ? conversationsData.reduce((total, conv) => total + conv.unreadCount, 0)
    : 0;
  
  return (
    <div className="flex h-[calc(100vh-16rem)] overflow-hidden bg-white shadow rounded-lg">
      {/* Conversations list */}
      <div className="w-full sm:w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
          {unreadMessageCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {unreadMessageCount}
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading conversations...</p>
            </div>
          ) : conversationsError ? (
            <div className="p-4 text-center text-red-500">
              <p>Error loading conversations. Please try again later.</p>
            </div>
          ) : !conversationsData || conversationsData.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {conversationsData.map((conversation) => (
                <li 
                  key={conversation.userId}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedConversation === conversation.userId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation.userId);
                    setAiAssistantMode(false); // Disable AI mode when switching conversations
                  }}
                >
                  <div className="p-4">
                    <div className="flex justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          {conversation.profileImageUrl ? (
                            <img 
                              src={conversation.profileImageUrl} 
                              alt={conversation.name} 
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            conversation.name.charAt(0)
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{conversation.name}</p>
                          <p className="text-xs text-gray-500">
                            {conversation.role === "NANNY" ? "Nanny" : "Admin"}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatMessageDate(new Date(conversation.lastMessage.createdAt))}
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <p className="text-sm text-gray-600 truncate max-w-[180px]">
                        {conversation.lastMessage.isFromUser ? 'You: ' : ''}
                        {conversation.lastMessage.content}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              
              {/* AI Assistant conversation option */}
              {isAIAvailable && (
                <li 
                  className={`cursor-pointer hover:bg-gray-50 ${
                    aiAssistantMode ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(null);
                    setAiAssistantMode(true);
                  }}
                >
                  <div className="p-4">
                    <div className="flex justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">AI Parenting Assistant</p>
                          <p className="text-xs text-gray-500">
                            Ask parenting questions
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
      
      {/* Message area */}
      <div className="hidden sm:flex flex-col flex-1">
        {selectedConversation && !aiAssistantMode ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                {selectedConversationDetails && (
                  <>
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {selectedConversationDetails.profileImageUrl ? (
                        <img 
                          src={selectedConversationDetails.profileImageUrl} 
                          alt={selectedConversationDetails.name} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        selectedConversationDetails.name.charAt(0)
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedConversationDetails.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedConversationDetails.role === "NANNY" 
                          ? "Nanny" 
                          : "Admin"}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {isAIAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAIAssistant}
                >
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  AI Assistant
                </Button>
              )}
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col-reverse">
              {isLoadingMessages && !messages.length ? (
                <div className="flex justify-center items-center h-full">
                  <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : messagesError ? (
                <div className="flex justify-center items-center h-full text-red-500">
                  <p>Error loading messages. Please try again later.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div ref={messagesEndRef} />
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs sm:max-w-md rounded-lg px-4 py-2 ${
                          message.isFromUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.aiSummary && (
                          <div className={`mt-2 pt-2 ${
                            message.isFromUser
                              ? 'border-t border-blue-500 text-xs text-blue-100'
                              : 'border-t border-gray-300 text-xs text-gray-600'
                          }`}>
                            <p className="font-medium mb-1">AI Summary:</p>
                            <p>{message.aiSummary}</p>
                          </div>
                        )}
                        <p className="text-xs mt-1 text-right">
                          {formatMessageDate(new Date(message.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load more button */}
                  {hasNextPage && (
                    <div className="flex justify-center my-4">
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        {isFetchingNextPage ? 'Loading older messages...' : 'Load older messages'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Message form */}
            <div className="p-4 border-t border-gray-200">
              <MessageForm 
                recipientId={selectedConversation}
                onMessageSent={handleMessageSent}
                children={childrenData?.children || []}
              />
            </div>
          </>
        ) : aiAssistantMode ? (
          <>
            {/* AI Assistant Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    AI Parenting Assistant
                  </p>
                  <p className="text-xs text-gray-500">
                    Ask questions about child development, parenting, or care routines
                  </p>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAIAssistant}
              >
                Return to Messages
              </Button>
            </div>
            
            {/* AI Assistant Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <h3 className="text-purple-800 font-medium mb-2">AI Parenting Assistant</h3>
                <p className="text-sm text-gray-700 mb-2">
                  I can help answer your parenting questions, provide tips on child development, 
                  or suggest activities for your children. Try asking me:
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-700 mb-2">
                  <li>How can I help my toddler sleep better?</li>
                  <li>What activities are good for my 18-month-old's development?</li>
                  <li>How should I handle tantrums?</li>
                  <li>What are signs my child might be ready for potty training?</li>
                </ul>
                <p className="text-xs text-gray-500 italic">
                  Note: This AI assistant provides general guidance, not medical advice. 
                  Always consult healthcare professionals for medical concerns.
                </p>
              </div>
              
              {/* Placeholder for AI conversation - in a real implementation, this would show the conversation history */}
              <div className="text-center text-gray-500 my-8">
                <p>Your conversation with the AI assistant will appear here.</p>
                <p className="text-sm mt-2">Start by typing a question below.</p>
              </div>
            </div>
            
            {/* AI Message form */}
            <div className="p-4 border-t border-gray-200">
              <div className="relative">
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ask a parenting question..."
                ></textarea>
                <button
                  type="button"
                  className="absolute right-3 bottom-3 inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                >
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Ask
                </button>
              </div>
              <div className="mt-2 flex items-center">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeResources"
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label
                    htmlFor="includeResources"
                    className="ml-2 block text-xs text-gray-700"
                  >
                    Include relevant resources
                  </label>
                </div>
                
                {childrenData?.children && childrenData.children.length > 0 && (
                  <div className="ml-4">
                    <select
                      className="rounded-md border border-gray-300 py-1 pl-2 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">No specific child</option>
                      {childrenData.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.firstName} {child.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-sm text-gray-500">Choose a conversation from the list to start messaging.</p>
              
              {isAIAvailable && (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={toggleAIAssistant}
                  >
                    <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Try AI Assistant
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
