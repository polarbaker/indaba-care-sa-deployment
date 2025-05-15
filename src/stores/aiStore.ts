import { create } from 'zustand';

interface AIStore {
  isAIAvailable: boolean;
  isCheckingAIAvailability: boolean;
  setAIAvailable: (available: boolean) => void;
  setIsCheckingAIAvailability: (isChecking: boolean) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isAIAvailable: false, // Default to false until we check with the server
  isCheckingAIAvailability: false,
  
  setAIAvailable: (available: boolean) => set({ isAIAvailable: available }),
  setIsCheckingAIAvailability: (isChecking: boolean) => set({ isCheckingAIAvailability: isChecking }),
}));