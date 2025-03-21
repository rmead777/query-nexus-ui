
import { useState, useEffect } from 'react';
import { useConversationStore } from './use-conversation-store';

export function useAutoSavePreference() {
  const { autoSave, setAutoSavePreference } = useConversationStore();
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Use a small timeout to ensure the store is initialized
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return {
    autoSave,
    setAutoSavePreference,
    isLoaded
  };
}
