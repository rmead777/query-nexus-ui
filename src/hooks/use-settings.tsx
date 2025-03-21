
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Define a type for the response sources settings
export interface ResponseSourceSettings {
  useDocuments: boolean;
  useKnowledgeBase: boolean;
  useExternalSearch: boolean;
}

export interface UserSettings {
  api_endpoint?: string;
  api_key?: string;
  azure_api_key?: string;
  azure_deployment_name?: string;
  azure_endpoint_url?: string;
  azure_search_endpoint?: string;
  azure_search_index_name?: string;
  azure_search_key?: string;
  use_azure?: boolean;
  temperature?: number;
  max_tokens?: number;
  model?: string;
  instructions?: string;
  response_sources?: ResponseSourceSettings;
  auto_save_conversations?: boolean;
  show_citations?: boolean;
  citation_style?: string;
  user_id: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          // Parse response_sources if it exists
          const processedSettings: UserSettings = {
            ...data,
            user_id: user.id,
            response_sources: parseResponseSources(data.response_sources)
          };
          
          setSettings(processedSettings);
        } else {
          setSettings(null);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Helper function to safely parse response_sources
  const parseResponseSources = (responseSources: any): ResponseSourceSettings => {
    const defaultSources: ResponseSourceSettings = {
      useDocuments: true,
      useKnowledgeBase: true,
      useExternalSearch: false
    };

    if (!responseSources) return defaultSources;

    try {
      if (typeof responseSources === 'string') {
        const parsed = JSON.parse(responseSources);
        return {
          useDocuments: parsed.useDocuments ?? defaultSources.useDocuments,
          useKnowledgeBase: parsed.useKnowledgeBase ?? defaultSources.useKnowledgeBase,
          useExternalSearch: parsed.useExternalSearch ?? defaultSources.useExternalSearch
        };
      } 
      
      if (typeof responseSources === 'object') {
        return {
          useDocuments: responseSources.useDocuments ?? defaultSources.useDocuments,
          useKnowledgeBase: responseSources.useKnowledgeBase ?? defaultSources.useKnowledgeBase,
          useExternalSearch: responseSources.useExternalSearch ?? defaultSources.useExternalSearch
        };
      }
    } catch (e) {
      console.error('Error parsing response_sources:', e);
    }
    
    return defaultSources;
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return false;

    try {
      // Handle response_sources for DB storage
      let settingsToSave = {...newSettings};
      
      if (newSettings.response_sources) {
        settingsToSave = {
          ...settingsToSave,
          response_sources: newSettings.response_sources
        };
      }

      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('user_settings')
          .update(settingsToSave)
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('user_settings')
          .insert({
            ...settingsToSave,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return {
    settings,
    saveSettings,
    isLoading
  };
}
