
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APISettingsTab } from '@/components/settings/APISettingsTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { AdvancedTab } from '@/components/settings/AdvancedTab';
import { AzureTab } from '@/components/settings/AzureTab';
import { EndpointsTab } from '@/components/settings/EndpointsTab';
import { useToast } from "@/components/ui/use-toast";
import { useSettings, ResponseSourceSettings } from '@/hooks/use-settings';
import { useLocation } from 'react-router-dom';

const Settings = () => {
  const { toast } = useToast();
  const { settings, saveSettings, isLoading } = useSettings();
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("api");

  // Get tab from URL if available
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['api', 'azure', 'endpoints', 'preferences', 'advanced'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Set up state for each tab's settings
  const [apiSettings, setApiSettings] = useState({
    apiKey: '',
    apiEndpoint: '',
    model: 'gpt-4o-mini',
  });

  const [azureSettings, setAzureSettings] = useState({
    useAzure: false,
    azureApiKey: '',
    azureEndpointUrl: '',
    azureDeploymentName: '',
    azureSearchEndpoint: '',
    azureSearchKey: '',
    azureSearchIndexName: ''
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    instructions: ''
  });

  const [responseSources, setResponseSources] = useState<ResponseSourceSettings>({
    useDocuments: true,
    useKnowledgeBase: true,
    useExternalSearch: false
  });

  // Load settings when available
  useEffect(() => {
    if (settings) {
      setApiSettings({
        apiKey: settings.api_key || '',
        apiEndpoint: settings.api_endpoint || '',
        model: settings.model || 'gpt-4o-mini',
      });

      setAzureSettings({
        useAzure: settings.use_azure || false,
        azureApiKey: settings.azure_api_key || '',
        azureEndpointUrl: settings.azure_endpoint_url || '',
        azureDeploymentName: settings.azure_deployment_name || '',
        azureSearchEndpoint: settings.azure_search_endpoint || '',
        azureSearchKey: settings.azure_search_key || '',
        azureSearchIndexName: settings.azure_search_index_name || ''
      });

      setAdvancedSettings({
        temperature: settings.temperature || 0.7,
        maxTokens: settings.max_tokens || 2048,
        instructions: settings.instructions || ''
      });

      if (settings.response_sources) {
        setResponseSources(settings.response_sources);
      }
    }
  }, [settings]);

  const handleSaveSettings = async (newSettings: any) => {
    setSaving(true);
    try {
      await saveSettings(newSettings);
      toast({
        title: "Settings saved!",
        description: "Your settings have been successfully saved.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem saving your settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="azure">Azure</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api">
            <APISettingsTab 
              apiSettings={apiSettings}
              setApiSettings={setApiSettings}
              onSave={(values) => {
                handleSaveSettings({
                  api_key: values.apiKey,
                  api_endpoint: values.apiEndpoint,
                  model: values.model
                });
              }}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="azure">
            <AzureTab 
              azureSettings={azureSettings}
              setAzureSettings={setAzureSettings}
              useAzure={azureSettings.useAzure}
              setUseAzure={(useAzure) => setAzureSettings(prev => ({...prev, useAzure}))}
              onSave={(values) => {
                handleSaveSettings({
                  use_azure: values.useAzure,
                  azure_api_key: values.azureApiKey,
                  azure_endpoint_url: values.azureEndpointUrl,
                  azure_deployment_name: values.azureDeploymentName,
                  azure_search_endpoint: values.azureSearchEndpoint,
                  azure_search_key: values.azureSearchKey,
                  azure_search_index_name: values.azureSearchIndexName
                });
              }}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="endpoints">
            <EndpointsTab />
          </TabsContent>
          
          <TabsContent value="preferences">
            <PreferencesTab 
              responseSources={responseSources}
              setResponseSources={setResponseSources}
              handleSaveSettings={(values) => {
                handleSaveSettings({
                  auto_save_conversations: values.auto_save_conversations,
                  show_citations: values.show_citations,
                  citation_style: values.citation_style,
                  response_sources: values.response_sources
                });
              }}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="advanced">
            <AdvancedTab 
              advancedSettings={advancedSettings}
              setAdvancedSettings={setAdvancedSettings}
              apiSettings={apiSettings}
              setApiSettings={setApiSettings}
              onSave={(values) => {
                handleSaveSettings({
                  temperature: values.temperature,
                  max_tokens: values.maxTokens,
                  instructions: values.instructions
                });
              }}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
