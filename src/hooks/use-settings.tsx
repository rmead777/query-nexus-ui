
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

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
  response_sources?: {
    useDocuments: boolean;
    useKnowledgeBase: boolean;
    useExternalSearch: boolean;
  };
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
        
        // Parse response_sources if it exists
        if (data && typeof data.response_sources === 'string') {
          try {
            data.response_sources = JSON.parse(data.response_sources);
          } catch (e) {
            console.error('Error parsing response_sources:', e);
            data.response_sources = {
              useDocuments: true,
              useKnowledgeBase: true,
              useExternalSearch: false
            };
          }
        }
        
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return false;

    try {
      // Make sure response_sources is properly formatted
      if (newSettings.response_sources && typeof newSettings.response_sources !== 'string') {
        newSettings = {
          ...newSettings,
          response_sources: newSettings.response_sources as unknown as Json
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
          .update(newSettings)
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('user_settings')
          .insert({
            ...newSettings,
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
