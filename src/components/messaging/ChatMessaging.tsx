import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useAIStore } from "~/stores/aiStore";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useConversationsStore, shouldUseCachedConversations } from "~/stores/conversationsStore";
import { MessageForm } from "~/components/messaging/MessageForm";
import { MessageComposer } from "~/components/messaging/MessageComposer";
import { Button } from "~/components/ui/Button";
import { checkAIAvailability } from "~/lib/aiHelpers";
import toast from "react-hot-toast";

export function ChatMessaging() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [aiAssistantMode, setAiAssistantMode] = useState<boolean>(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [threadLoadingError, setThreadLoadingError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isThreadRetrying, setIsThreadRetrying] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuthStore();
  const { isAIAvailable } = useAIStore();
  const { isOnline, connectionQuality } = useNetworkStatus();
  const { 
    conversations: cachedConversations, 
    messageThreads: cachedMessageThreads,
    setConversations,
    setMessageThread,
    appendMessages,
    addMessage,
    hasError,
    setHasError,
    incrementRetryCount,
    resetRetryCount,
    retryCount
  } = useConversationsStore();
  
  const utils = api.useUtils();
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    error: conversationsError,
    refetch: refetchConversations
  } = api.getConversations.useQuery(
    { token: token || "" },
    {
      enabled: !!token && isOnline,
      onSuccess: (data) => {
        // Cache the successful response
        setConversations(data);
        setLoadingError(null);
        resetRetryCount();
        setUsingCachedData(false);
        
        if (data.length > 0) {
          toast.success("Conversations loaded", { id: "conversations-loaded" });
        }
      },
      onError: (err) => {
        console.error("Error fetching conversations:", err);
        setLoadingError("Couldn't load your conversations.");
        setHasError(true);
        incrementRetryCount();
        
        // After multiple failures, try to use cached data
        if (retryCount >= 2 && shouldUseCachedConversations()) {
          setUsingCachedData(true);
          setShowOfflineBanner(true);
        }
      },
      refetchInterval: isOnline ? 30000 : false // Refetch every 30 seconds when online
    }
  );
  
  // Fetch messages for the selected conversation
  const { 
    data: messagesData, 
    isLoading: isLoadingMessages,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages
  } = api.getMessages.useInfiniteQuery(
    { 
      token: token || "",
      otherUserId: selectedConversation || "",
      limit: 20,
      markAsRead: true
    },
    {
      enabled: !!token && !!selectedConversation && isOnline,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      onSuccess: (data) => {
        if (selectedConversation) {
          // Cache the successful response
          setMessageThread(
            selectedConversation, 
            data.pages.flatMap(page => page.data),
            data.pages[data.pages.length - 1].nextCursor
          );
          setThreadLoadingError(null);
        }
      },
      onError: (err) => {
        console.error("Error fetching messages:", err);
        setThreadLoadingError("Failed to load messages.");
      },
      refetchInterval: isOnline && !aiAssistantMode ? 10000 : false // Refetch every 10 seconds unless in AI mode or offline
    }
  );

  // Fetch assigned children for message context
  const { data: childrenData } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    {
      enabled: !!token && isOnline,
      onError: (err) => {
        console.error("Error fetching children:", err);
      }
    }
  );

  // Handle offline status changes
  useEffect(() => {
    // When going offline, check if we should show cached data
    if (!isOnline && shouldUseCachedConversations()) {
      setUsingCachedData(true);
      setShowOfflineBanner(true);
    }
    
    // When coming back online, try to refresh data
    if (isOnline && usingCachedData) {
      refetchConversations();
      if (selectedConversation) {
        refetchMessages();
      }
    }
  }, [isOnline, usingCachedData, refetchConversations, refetchMessages, selectedConversation]);

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
    toast.success("Message sent!", { id: "message-sent" });
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
  
  // Handle retry for conversations list
  const handleRetryConversations = () => {
    setIsRetrying(true);
    setLoadingError(null);
    
    // Try to get fresh data from server
    refetchConversations()
      .then(() => {
        setIsRetrying(false);
        setShowOfflineBanner(false);
        setUsingCachedData(false);
      })
      .catch(() => {
        setIsRetrying(false);
        // If still offline and we have cached data, show it
        if (!isOnline && shouldUseCachedConversations()) {
          setUsingCachedData(true);
          setShowOfflineBanner(true);
        }
      });
  };
  
  // Handle retry for message thread
  const handleRetryMessages = () => {
    if (!selectedConversation) return;
    
    setIsThreadRetrying(true);
    setThreadLoadingError(null);
    
    refetchMessages()
      .then(() => {
        setIsThreadRetrying(false);
      })
      .catch(() => {
        setIsThreadRetrying(false);
      });
  };
  
  // Determine which conversations to display
  const displayedConversations = usingCachedData ? cachedConversations : conversationsData || [];
  
  // Determine which messages to display
  const messages = messagesData?.pages.flatMap(page => page.data) || 
    (usingCachedData && selectedConversation && cachedMessageThreads[selectedConversation]?.messages) || 
    [];
  
  // Find the selected conversation details
  const selectedConversationDetails = displayedConversations.find(
    c => c.userId === selectedConversation
  );
  
  // Get unread message count
  const unreadMessageCount = displayedConversations
    ? displayedConversations.reduce((total, conv) => total + conv.unreadCount, 0)
    : 0;
  
  // Determine if we're in a truly empty state (no conversations even in cache)
  const isTrulyEmpty = !isLoadingConversations && displayedConversations.length === 0;
  
  // Determine if the "New" button should be disabled
  const isNewButtonDisabled = isLoadingConversations && !usingCachedData && displayedConversations.length === 0;
  
  // Render skeleton item for conversation list
  const renderSkeletonItem = (key: number) => (
    <li key={`skeleton-${key}`} className="animate-pulse">
      <div className="p-4">
        <div className="flex justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            <div className="ml-3">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
            </div>
          </div>
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="mt-2 h-3 w-40 bg-gray-200 rounded"></div>
      </div>
    </li>
  );
  
  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="bg-amber-50 border-b border-amber-200" role="alert">
          <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="w-0 flex-1 flex items-center">
                <span className="flex p-2 rounded-lg bg-amber-100">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </span>
                <p className="ml-3 font-medium text-amber-700 truncate">
                  <span className="md:hidden">You're offline. Showing saved conversations.</span>
                  <span className="hidden md:inline">You're offline. Showing saved conversations from your last session.</span>
                </p>
              </div>
              <div className="flex-shrink-0 order-2 mt-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRetryConversations}
                  isLoading={isRetrying}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      <div className="flex h-[calc(100vh-16rem)] overflow-hidden bg-white shadow rounded-lg">
        {/* Conversations list */}
        <div className="w-full sm:w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
            <div className="flex items-center space-x-2">
              {unreadMessageCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadMessageCount}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComposerOpen(true)}
                aria-label="New Message"
                disabled={isNewButtonDisabled}
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && !usingCachedData ? (
              <div className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => renderSkeletonItem(i))}
              </div>
            ) : loadingError && !usingCachedData ? (
              <div className="p-4 text-center" role="alert">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium mb-2">⚠️ Couldn't load your conversations.</p>
                <Button
                  onClick={handleRetryConversations}
                  isLoading={isRetrying}
                >
                  Retry
                </Button>
              </div>
            ) : isTrulyEmpty ? (
              <div className="p-4 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <p className="text-gray-900 font-medium mb-2">No conversations yet.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-2">
                  <Button
                    onClick={() => setIsComposerOpen(true)}
                  >
                    New Conversation
                  </Button>
                  
                  {isAIAvailable && (
                    <Button
                      variant="outline"
                      onClick={toggleAIAssistant}
                    >
                      <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                      Try AI Assistant
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {displayedConversations.map((conversation) => (
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
                {(isLoadingMessages && !messages.length) ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : threadLoadingError ? (
                  <div className="flex justify-center items-center h-full text-red-500" role="alert">
                    <div className="text-center">
                      <p className="mb-2">⚠️ Failed to load messages.</p>
                      <Button 
                        onClick={handleRetryMessages}
                        isLoading={isThreadRetrying}
                      >
                        Retry
                      </Button>
                    </div>
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
        
        {/* Message Composer Modal */}
        {isComposerOpen && (
          <div className="absolute inset-0 z-20 bg-white md:bg-gray-500 md:bg-opacity-75 flex items-center justify-center">
            <div className="w-full max-w-lg">
              <MessageComposer
                onMessageSent={() => {
                  setIsComposerOpen(false);
                  handleMessageSent(); // Existing handler to refresh conversations/messages
                }}
                children={childrenData?.children || []}
                className="shadow-2xl rounded-lg"
              />
              {/* Close button for the modal - specific to this modal implementation */}
               <button 
                  onClick={() => setIsComposerOpen(false)} 
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 md:text-white md:hover:text-gray-200"
                  aria-label="Close new message composer"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Floating Action Button for New Message */}
        <MessageComposer
          floatingButton={true}
          onMessageSent={() => {
            handleMessageSent(); // Existing handler to refresh conversations/messages
          }}
          children={childrenData?.children || []}
        />
      </div>
    </>
  );
}
