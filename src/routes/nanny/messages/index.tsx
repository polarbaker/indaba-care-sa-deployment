import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { MessageForm } from "~/components/messaging/MessageForm";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";

const nannyNavigation = [
  {
    name: "Dashboard",
    to: "/nanny/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/nanny/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Observations",
    to: "/nanny/observations/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/nanny/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Professional Dev",
    to: "/nanny/professional-development/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: "Hours Log",
    to: "/nanny/hours-log/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const Route = createFileRoute("/nanny/messages/")({
  component: NannyMessages,
});

function NannyMessages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  // State for conversation and message loading
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
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
        setError(`Failed to load conversations: ${err.message}`);
        console.error("Error fetching conversations:", err);
      }
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
        setError(`Failed to load messages: ${err.message}`);
        console.error("Error fetching messages:", err);
      }
    }
  );

  // Flatten the messages from all pages
  const messages = messagesData?.pages.flatMap(page => page.data) || [];

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

  // Handle message sent successfully
  const handleMessageSent = () => {
    // Invalidate both queries to refresh the data
    void utils.getMessages.invalidate();
    void utils.getConversations.invalidate();
  };
  
  // Format the date for display
  const formatMessageDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <DashboardLayout 
      title="Messages" 
      navigation={nannyNavigation}
    >
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden bg-white shadow rounded-lg">
        {/* Conversations list */}
        <div className="w-full sm:w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
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
                    onClick={() => setSelectedConversation(conversation.userId)}
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
                              {conversation.role === "PARENT" ? "Parent" : "Admin"}
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
              </ul>
            )}
          </div>
        </div>
        
        {/* Message area */}
        <div className="hidden sm:flex flex-col flex-1">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center">
                {conversationsData && (
                  <>
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {(() => {
                        const conversation = conversationsData.find(c => c.userId === selectedConversation);
                        if (!conversation) return null;
                        
                        return conversation.profileImageUrl ? (
                          <img 
                            src={conversation.profileImageUrl} 
                            alt={conversation.name} 
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          conversation.name.charAt(0)
                        );
                      })()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {conversationsData.find(c => c.userId === selectedConversation)?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {conversationsData.find(c => c.userId === selectedConversation)?.role === "PARENT" 
                          ? "Parent" 
                          : "Admin"}
                      </p>
                    </div>
                  </>
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
                            <div className="mt-2 pt-2 border-t border-blue-500 text-xs text-blue-100">
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
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a conversation</h3>
                <p className="mt-1 text-sm text-gray-500">Choose a conversation from the list to start messaging.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}