
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
import { ApiEndpoint } from '@/types/api';

// Define types for each tab's settings
interface ApiSettingsState {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
}

interface AzureSettingsState {
  useAzure: boolean;
  azureApiKey: string;
  azureEndpointUrl: string;
  azureDeploymentName: string;
  azureSearchEndpoint: string;
  azureSearchKey: string;
  azureSearchIndexName: string;
  endpointUrl: string;
  deploymentName: string;
  searchEndpoint: string;
  searchKey: string;
  searchIndexName: string;
  apiKey: string; // Added to match AzureSettings interface
}

interface AdvancedSettingsState {
  temperature: number;
  maxTokens: number;
  instructions: string;
  requestTemplate: Record<string, any> | null;
  showAdvanced: boolean;
}

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
  const [apiSettings, setApiSettings] = useState<ApiSettingsState>({
    apiKey: '',
    apiEndpoint: '',
    model: 'gpt-4o-mini',
    endpoint: '',
    temperature: 0.7,
    maxTokens: 2048,
    instructions: ''
  });

  const [azureSettings, setAzureSettings] = useState<AzureSettingsState>({
    useAzure: false,
    azureApiKey: '',
    azureEndpointUrl: '',
    azureDeploymentName: '',
    azureSearchEndpoint: '',
    azureSearchKey: '',
    azureSearchIndexName: '',
    endpointUrl: '',
    deploymentName: '',
    searchEndpoint: '',
    searchKey: '',
    searchIndexName: '',
    apiKey: '' // Added to match AzureSettings interface
  });

  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettingsState>({
    temperature: 0.7,
    maxTokens: 2048,
    instructions: '',
    requestTemplate: null,
    showAdvanced: false
  });

  const [responseSources, setResponseSources] = useState<ResponseSourceSettings>({
    useDocuments: true,
    useKnowledgeBase: true,
    useExternalSearch: false
  });

  // For the endpoints tab
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);
  const [isEditingEndpoint, setIsEditingEndpoint] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  
  const [newEndpoint, setNewEndpoint] = useState<Partial<ApiEndpoint>>({
    name: '',
    provider: 'OpenAI',
    api_endpoint: '',
    api_key: '',
    model: ''
  });

  const handleProviderSelect = (provider: string) => {
    setNewEndpoint(prev => ({ ...prev, provider }));
  };

  const handleEndpointSelect = (endpointId: string) => {
    // This would be implemented to select an endpoint
    console.log("Selected endpoint:", endpointId);
    setSelectedEndpointId(endpointId);
  };

  const handleModelSelect = (model: string) => {
    setApiSettings(prev => ({ ...prev, model }));
  };
  
  const handleAddEndpoint = async () => {
    // Implementation for adding an endpoint
    console.log("Adding endpoint:", newEndpoint);
  };
  
  const handleEditEndpoint = (endpoint: ApiEndpoint) => {
    // Implementation for editing an endpoint
    console.log("Editing endpoint:", endpoint);
    setIsEditingEndpoint(true);
    setNewEndpoint(endpoint);
  };
  
  const handleDeleteEndpoint = async (id: string) => {
    // Implementation for deleting an endpoint
    console.log("Deleting endpoint:", id);
  };
  
  const handleSetActiveEndpoint = async (id: string) => {
    // Implementation for setting an active endpoint
    console.log("Setting active endpoint:", id);
  };

  // Load settings when available
  useEffect(() => {
    if (settings) {
      setApiSettings({
        apiKey: settings.api_key || '',
        apiEndpoint: settings.api_endpoint || '',
        model: settings.model || 'gpt-4o-mini',
        endpoint: settings.api_endpoint || '',
        temperature: settings.temperature || 0.7,
        maxTokens: settings.max_tokens || 2048,
        instructions: settings.instructions || ''
      });

      setAzureSettings({
        useAzure: settings.use_azure || false,
        azureApiKey: settings.azure_api_key || '',
        azureEndpointUrl: settings.azure_endpoint_url || '',
        azureDeploymentName: settings.azure_deployment_name || '',
        azureSearchEndpoint: settings.azure_search_endpoint || '',
        azureSearchKey: settings.azure_search_key || '',
        azureSearchIndexName: settings.azure_search_index_name || '',
        endpointUrl: settings.azure_endpoint_url || '',
        deploymentName: settings.azure_deployment_name || '',
        searchEndpoint: settings.azure_search_endpoint || '',
        searchKey: settings.azure_search_key || '',
        searchIndexName: settings.azure_search_index_name || '',
        apiKey: settings.azure_api_key || '' // Added to match interface
      });

      setAdvancedSettings({
        temperature: settings.temperature || 0.7,
        maxTokens: settings.max_tokens || 2048,
        instructions: settings.instructions || '',
        requestTemplate: null,
        showAdvanced: false
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
              apiEndpoints={apiEndpoints}
              selectedEndpointId={selectedEndpointId}
              setSelectedEndpointId={setSelectedEndpointId}
              modelOptions={[
                { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' }
              ]}
              selectedModel={apiSettings.model}
              handleEndpointSelect={handleEndpointSelect}
              handleModelSelect={handleModelSelect}
              handleSaveSettings={(type) => handleSaveSettings({
                api_key: apiSettings.apiKey,
                api_endpoint: apiSettings.apiEndpoint,
                model: apiSettings.model
              })}
              saving={saving}
              newEndpoint={newEndpoint}
              handleProviderSelect={handleProviderSelect}
            />
          </TabsContent>
          
          <TabsContent value="azure">
            <AzureTab 
              azureSettings={azureSettings}
              setAzureSettings={setAzureSettings}
              useAzure={azureSettings.useAzure}
              setUseAzure={(useAzureValue) => setAzureSettings(prev => ({...prev, useAzure: useAzureValue}))}
              initialValues={{
                useAzure: azureSettings.useAzure,
                azureApiKey: azureSettings.azureApiKey,
                azureEndpointUrl: azureSettings.azureEndpointUrl,
                azureDeploymentName: azureSettings.azureDeploymentName,
                azureSearchEndpoint: azureSettings.azureSearchEndpoint,
                azureSearchKey: azureSettings.azureSearchKey,
                azureSearchIndexName: azureSettings.azureSearchIndexName
              }}
              onSave={(values) => handleSaveSettings({
                use_azure: values.useAzure,
                azure_api_key: values.azureApiKey,
                azure_endpoint_url: values.azureEndpointUrl,
                azure_deployment_name: values.azureDeploymentName,
                azure_search_endpoint: values.azureSearchEndpoint,
                azure_search_key: values.azureSearchKey,
                azure_search_index_name: values.azureSearchIndexName
              })}
              saving={saving}
              showAzureKey={showAzureKey}
              setShowAzureKey={setShowAzureKey}
              showSearchKey={showSearchKey}
              setShowSearchKey={setShowSearchKey}
            />
          </TabsContent>
          
          <TabsContent value="endpoints">
            <EndpointsTab 
              apiEndpoints={apiEndpoints}
              newEndpoint={newEndpoint}
              setNewEndpoint={setNewEndpoint}
              isAddingEndpoint={isAddingEndpoint}
              setIsAddingEndpoint={setIsAddingEndpoint}
              isEditingEndpoint={isEditingEndpoint}
              setIsEditingEndpoint={setIsEditingEndpoint}
              handleAddEndpoint={handleAddEndpoint}
              handleEditEndpoint={handleEditEndpoint}
              handleDeleteEndpoint={handleDeleteEndpoint}
              handleSetActiveEndpoint={handleSetActiveEndpoint}
              saving={saving}
              showNewApiKey={showNewApiKey}
              setShowNewApiKey={setShowNewApiKey}
            />
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
              handleSaveSettings={(type) => handleSaveSettings({
                temperature: advancedSettings.temperature,
                max_tokens: advancedSettings.maxTokens,
                instructions: advancedSettings.instructions
              })}
              saving={saving}
              newEndpoint={newEndpoint}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
