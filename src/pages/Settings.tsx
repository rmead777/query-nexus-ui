import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APISettingsTab } from '@/components/settings/APISettingsTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { AdvancedTab } from '@/components/settings/AdvancedTab';
import { AzureTab } from '@/components/settings/AzureTab';
import { EndpointsTab } from '@/components/settings/EndpointsTab';
import { useToast } from "@/components/ui/use-toast"
import { useSettings } from '@/hooks/use-settings';

const Settings = () => {
  const { toast } = useToast()
  const { settings, saveSettings, isLoading } = useSettings();
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (newSettings: any) => {
    setSaving(true);
    try {
      await saveSettings(newSettings);
      toast({
        title: "Settings saved!",
        description: "Your settings have been successfully saved.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem saving your settings.",
      })
    } finally {
      setSaving(false);
    }
  };

  // Define the response sources state
  const [responseSources, setResponseSources] = useState({
    useDocuments: true,
    useKnowledgeBase: true,
    useExternalSearch: false
  });

  useEffect(() => {
    if (settings) {
      setResponseSources({
        useDocuments: settings.response_sources?.useDocuments ?? true,
        useKnowledgeBase: settings.response_sources?.useKnowledgeBase ?? true,
        useExternalSearch: settings.response_sources?.useExternalSearch ?? false,
      });
    }
  }, [settings]);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="azure">Azure</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api">
            <APISettingsTab 
              initialValues={{
                apiKey: settings?.api_key || '',
                apiEndpoint: settings?.api_endpoint || '',
                model: settings?.model || 'gpt-3.5-turbo',
              }}
              onSave={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="azure">
            <AzureTab
              initialValues={{
                useAzure: settings?.use_azure || false,
                azureApiKey: settings?.azure_api_key || '',
                azureEndpointUrl: settings?.azure_endpoint_url || '',
                azureDeploymentName: settings?.azure_deployment_name || '',
                azureSearchEndpoint: settings?.azure_search_endpoint || '',
                azureSearchKey: settings?.azure_search_key || '',
                azureSearchIndexName: settings?.azure_search_index_name || '',
              }}
              onSave={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="endpoints">
            <EndpointsTab
              initialValues={{
                apiEndpoint: settings?.api_endpoint || '',
              }}
              onSave={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="preferences">
            <PreferencesTab 
              responseSources={responseSources}
              setResponseSources={setResponseSources}
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="advanced">
            <AdvancedTab 
              initialValues={{
                temperature: settings?.temperature || 0.0,
                maxTokens: settings?.max_tokens || 4096,
                instructions: settings?.instructions || '',
              }}
              onSave={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
