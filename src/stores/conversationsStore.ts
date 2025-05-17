import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Define types for conversation and message data
export interface ConversationData {
  userId: string;
  name: string;
  role: string;
  profileImageUrl: string | null;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    isFromUser: boolean;
  };
  unreadCount: number;
}

export interface MessageData {
  id: string;
  content: string;
  encryptedContent?: string;
  aiSummary?: string;
  isRead: boolean;
  createdAt: string;
  isFromUser: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
    profileImageUrl: string | null;
  };
}

interface ConversationsState {
  conversations: ConversationData[];
  messageThreads: Record<string, { 
    messages: MessageData[]; 
    lastFetched: number;
    nextCursor?: string;
  }>;
  lastFetched: number | null;
  hasError: boolean;
  retryCount: number;
  
  // Actions
  setConversations: (conversations: ConversationData[]) => void;
  setMessageThread: (userId: string, messages: MessageData[], nextCursor?: string) => void;
  appendMessages: (userId: string, messages: MessageData[], nextCursor?: string) => void;
  addMessage: (userId: string, message: MessageData) => void;
  setLastFetched: (timestamp: number) => void;
  setHasError: (hasError: boolean) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  clearCache: () => void;
}

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messageThreads: {},
      lastFetched: null,
      hasError: false,
      retryCount: 0,
      
      setConversations: (conversations) => set({ 
        conversations,
        hasError: false,
        lastFetched: Date.now()
      }),
      
      setMessageThread: (userId, messages, nextCursor) => set((state) => ({
        messageThreads: {
          ...state.messageThreads,
          [userId]: {
            messages,
            lastFetched: Date.now(),
            nextCursor
          }
        }
      })),
      
      appendMessages: (userId, messages, nextCursor) => set((state) => {
        const existingThread = state.messageThreads[userId];
        if (!existingThread) {
          return {
            messageThreads: {
              ...state.messageThreads,
              [userId]: {
                messages,
                lastFetched: Date.now(),
                nextCursor
              }
            }
          };
        }
        
        // Combine existing and new messages, removing duplicates by ID
        const existingIds = new Set(existingThread.messages.map(m => m.id));
        const uniqueNewMessages = messages.filter(m => !existingIds.has(m.id));
        const combinedMessages = [...existingThread.messages, ...uniqueNewMessages];
        
        return {
          messageThreads: {
            ...state.messageThreads,
            [userId]: {
              messages: combinedMessages,
              lastFetched: Date.now(),
              nextCursor
            }
          }
        };
      }),
      
      addMessage: (userId, message) => set((state) => {
        const existingThread = state.messageThreads[userId];
        
        // Also update the conversation's last message if it exists
        let updatedConversations = [...state.conversations];
        const conversationIndex = updatedConversations.findIndex(c => c.userId === userId);
        
        if (conversationIndex !== -1) {
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            lastMessage: {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              isFromUser: message.isFromUser
            },
            // If the message is from the user, don't change unread count
            // If it's from the other person, increment unread count
            unreadCount: message.isFromUser 
              ? updatedConversations[conversationIndex].unreadCount
              : updatedConversations[conversationIndex].unreadCount + 1
          };
        }
        
        if (!existingThread) {
          return {
            messageThreads: {
              ...state.messageThreads,
              [userId]: {
                messages: [message],
                lastFetched: Date.now()
              }
            },
            conversations: updatedConversations
          };
        }
        
        // Add the message to the thread, avoiding duplicates
        const messageExists = existingThread.messages.some(m => m.id === message.id);
        if (messageExists) {
          return { conversations: updatedConversations };
        }
        
        return {
          messageThreads: {
            ...state.messageThreads,
            [userId]: {
              messages: [message, ...existingThread.messages],
              lastFetched: Date.now(),
              nextCursor: existingThread.nextCursor
            }
          },
          conversations: updatedConversations
        };
      }),
      
      setLastFetched: (timestamp) => set({ lastFetched: timestamp }),
      
      setHasError: (hasError) => set({ hasError }),
      
      incrementRetryCount: () => set((state) => ({
        retryCount: state.retryCount + 1
      })),
      
      resetRetryCount: () => set({ retryCount: 0 }),
      
      clearCache: () => set({
        conversations: [],
        messageThreads: {},
        lastFetched: null,
        hasError: false,
        retryCount: 0
      }),
    }),
    {
      name: "indaba-conversations-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        messageThreads: state.messageThreads,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

/**
 * Utility function to determine if cached conversations should be used
 * @param maxAge Maximum age of cache in milliseconds (default 1 hour)
 * @returns Boolean indicating if cached data should be used
 */
export function shouldUseCachedConversations(maxAge = 60 * 60 * 1000): boolean {
  const { lastFetched, conversations } = useConversationsStore.getState();
  
  // No cached data
  if (!lastFetched || conversations.length === 0) {
    return false;
  }
  
  // Cache is too old
  if (Date.now() - lastFetched > maxAge) {
    return false;
  }
  
  return true;
}
