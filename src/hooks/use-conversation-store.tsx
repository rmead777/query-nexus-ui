
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 } from '@/lib/uuid';
import { toast } from 'sonner';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ConversationState {
  id: string;
  messages: Message[];
  title: string;
  lastUpdated: Date;
}

export function useConversationStore() {
  const [currentConversation, setCurrentConversation] = useState<ConversationState | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(true); // Default to true
  const { user } = useAuth();
  
  // Load auto-save preference on mount
  useEffect(() => {
    const savedAutoSave = localStorage.getItem('autoSaveConversations');
    if (savedAutoSave !== null) {
      setAutoSave(savedAutoSave === 'true');
    }
  }, []);
  
  // Load conversation from localStorage on mount
  useEffect(() => {
    const savedConversation = localStorage.getItem('currentConversation');
    if (savedConversation) {
      try {
        const parsed = JSON.parse(savedConversation);
        // Convert timestamp strings back to Date objects
        const restoredConversation = {
          ...parsed,
          messages: parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          lastUpdated: new Date(parsed.lastUpdated)
        };
        setCurrentConversation(restoredConversation);
      } catch (error) {
        console.error('Error parsing saved conversation:', error);
      }
    }
  }, []);
  
  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem('currentConversation', JSON.stringify(currentConversation));
    }
  }, [currentConversation]);
  
  // Auto-save to Supabase when conversation updates if enabled
  useEffect(() => {
    const saveConversationToSupabase = async () => {
      if (!user || !currentConversation || !autoSave) return;
      
      // Only save if there are messages
      if (currentConversation.messages.length === 0) return;
      
      try {
        // Check if the conversation already exists
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('conversation_id')
          .eq('conversation_id', currentConversation.id)
          .single();
        
        if (existingConversation) {
          // Update existing conversation
          await supabase
            .from('conversations')
            .update({
              title: currentConversation.title || generateTitle(currentConversation.messages),
              messages: currentConversation.messages,
              updated_at: new Date().toISOString()
            })
            .eq('conversation_id', currentConversation.id);
        } else {
          // Insert new conversation
          await supabase
            .from('conversations')
            .insert({
              conversation_id: currentConversation.id,
              user_id: user.id,
              title: currentConversation.title || generateTitle(currentConversation.messages),
              messages: currentConversation.messages,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    };
    
    // Debounce the save to avoid too many database calls
    const timeoutId = setTimeout(() => {
      saveConversationToSupabase();
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [currentConversation, user, autoSave]);
  
  const startNewConversation = () => {
    setCurrentConversation({
      id: v4(),
      messages: [],
      title: '',
      lastUpdated: new Date()
    });
  };
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setCurrentConversation(prev => {
      if (!prev) {
        return {
          id: v4(),
          messages: [{
            ...message,
            id: v4(),
            timestamp: new Date()
          }],
          title: '',
          lastUpdated: new Date()
        };
      }
      
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            ...message,
            id: v4(),
            timestamp: new Date()
          }
        ],
        lastUpdated: new Date()
      };
    });
  };
  
  const setAutoSavePreference = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('autoSaveConversations', enabled.toString());
    
    toast(
      enabled ? 'Auto-save conversations enabled' : 'Auto-save conversations disabled',
      { duration: 3000 }
    );
  };
  
  const loadConversation = async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentConversation({
          id: data.conversation_id,
          messages: data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          title: data.title,
          lastUpdated: new Date(data.updated_at)
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return false;
    }
  };
  
  const generateTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      // Take first 30 characters of first user message
      return firstUserMessage.content.length > 30
        ? `${firstUserMessage.content.substring(0, 30)}...`
        : firstUserMessage.content;
    }
    return 'New Conversation';
  };
  
  return {
    currentConversation,
    startNewConversation,
    addMessage,
    autoSave,
    setAutoSavePreference,
    loadConversation
  };
}
