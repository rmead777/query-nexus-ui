
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ApiEndpoint, ModelOption, defaultRequestTemplates } from '@/types/api';
import { TooltipProvider } from '@/components/ui/tooltip';

// Import refactored components
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { APISettingsTab } from '@/components/settings/APISettingsTab';
import { EndpointsTab } from '@/components/settings/EndpointsTab';
import { AzureTab } from '@/components/settings/AzureTab';
import { AdvancedTab } from '@/components/settings/AdvancedTab';

interface ResponseSourceSettings {
  useDocuments: boolean;
  useKnowledgeBase: boolean;
  useExternalSearch: boolean;
}

interface AdvancedApiSettings {
  requestTemplate: Record<string, any> | null;
  showAdvanced: boolean;
}

const Settings = () => {
  const [apiSettings, setApiSettings] = useState({
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
    instructions: "You are a helpful assistant that provides accurate and concise information."
  });
  
  const [azureSettings, setAzureSettings] = useState({
    endpointUrl: '',
    deploymentName: '',
    searchEndpoint: '',
    searchKey: '',
    searchIndexName: '',
    apiKey: ''
  });
  
  const [responseSources, setResponseSources] = useState<ResponseSourceSettings>({
    useDocuments: true,
    useKnowledgeBase: true,
    useExternalSearch: false
  });
  
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);
  const [isEditingEndpoint, setIsEditingEndpoint] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState<Partial<ApiEndpoint>>({
    name: '',
    api_endpoint: '',
    api_key: '',
    model: '',
    provider: 'OpenAI'
  });
  
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic' },
    { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google' },
    { value: 'gemini-ultra', label: 'Gemini Ultra', provider: 'Google' },
    { value: 'command-r', label: 'Command R', provider: 'Cohere' },
    { value: 'command-r-plus', label: 'Command R+', provider: 'Cohere' },
  ]);
  
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useAzure, setUseAzure] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('preferences');
  
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedApiSettings>({
    requestTemplate: null,
    showAdvanced: false
  });
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab && ['preferences', 'api', 'endpoints', 'advanced', 'azure'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);
  
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (!settingsError && settingsData) {
          setApiSettings({
            endpoint: settingsData.api_endpoint || 'https://api.openai.com/v1',
            apiKey: settingsData.api_key || '',
            model: settingsData.model || 'gpt-4o',
            temperature: settingsData.temperature || 0.7,
            maxTokens: settingsData.max_tokens || 1024,
            instructions: (settingsData as any).instructions || "You are a helpful assistant that provides accurate and concise information."
          });
          
          setSelectedModel(settingsData.model || 'gpt-4o');
          
          setAzureSettings({
            endpointUrl: settingsData.azure_endpoint_url || '',
            deploymentName: settingsData.azure_deployment_name || '',
            searchEndpoint: settingsData.azure_search_endpoint || '',
            searchKey: settingsData.azure_search_key || '',
            searchIndexName: settingsData.azure_search_index_name || '',
            apiKey: settingsData.azure_api_key || ''
          });
          
          setUseAzure(settingsData.use_azure || false);
          
          if ((settingsData as any).response_sources) {
            const sourcesData = settingsData.response_sources as Record<string, unknown>;
            const typedSources: ResponseSourceSettings = {
              useDocuments: typeof sourcesData.useDocuments === 'boolean' ? sourcesData.useDocuments : true,
              useKnowledgeBase: typeof sourcesData.useKnowledgeBase === 'boolean' ? sourcesData.useKnowledgeBase : true,
              useExternalSearch: typeof sourcesData.useExternalSearch === 'boolean' ? sourcesData.useExternalSearch : false
            };
            setResponseSources(typedSources);
          }
          
          if ((settingsData as any).request_template) {
            setAdvancedSettings({
              ...advancedSettings,
              requestTemplate: (settingsData as any).request_template
            });
          }
        }
        
        const { data: endpointsData, error: endpointsError } = await supabase
          .from('api_endpoints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (!endpointsError && endpointsData) {
          setApiEndpoints(endpointsData);
          
          const userModels: ModelOption[] = endpointsData
            .filter(endpoint => endpoint.model)
            .map(endpoint => ({
              value: endpoint.model as string,
              label: `${endpoint.name} (${endpoint.model})`,
              provider: endpoint.provider
            }));
          
          const allModelOptions = [...modelOptions];
          
          userModels.forEach(userModel => {
            const existingModelIndex = allModelOptions.findIndex(m => m.value === userModel.value);
            
            if (existingModelIndex === -1) {
              allModelOptions.push(userModel);
            }
          });
          
          setModelOptions(allModelOptions);
          
          const activeEndpoint = endpointsData.find(endpoint => endpoint.is_active);
          if (activeEndpoint) {
            setSelectedEndpointId(activeEndpoint.id);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserSettings();
  }, [user]);
  
  const handleEndpointSelect = (endpointId: string) => {
    const selectedEndpoint = apiEndpoints.find(endpoint => endpoint.id === endpointId);
    if (selectedEndpoint) {
      setApiSettings({
        ...apiSettings,
        endpoint: selectedEndpoint.api_endpoint || 'https://api.openai.com/v1',
        apiKey: selectedEndpoint.api_key || '',
        model: selectedEndpoint.model || 'gpt-4o'
      });
      
      setSelectedModel(selectedEndpoint.model || null);
    }
  };
  
  const handleModelSelect = (modelValue: string) => {
    setSelectedModel(modelValue);
    setApiSettings({
      ...apiSettings,
      model: modelValue
    });
    
    const endpointWithModel = apiEndpoints.find(endpoint => endpoint.model === modelValue);
    if (endpointWithModel) {
      setApiSettings({
        ...apiSettings,
        endpoint: endpointWithModel.api_endpoint || 'https://api.openai.com/v1',
        apiKey: endpointWithModel.api_key || '',
        model: modelValue
      });
      
      setSelectedEndpointId(endpointWithModel.id);
    }
  };
  
  const handleSaveSettings = async (settingType: 'preferences' | 'api' | 'azure' | 'advanced') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to save settings.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      let settingsData = {};
      
      if (settingType === 'preferences') {
        settingsData = {
          response_sources: responseSources,
          updated_at: new Date().toISOString()
        };
      } else if (settingType === 'api') {
        settingsData = {
          api_endpoint: apiSettings.endpoint,
          api_key: apiSettings.apiKey,
          model: apiSettings.model,
          temperature: apiSettings.temperature,
          max_tokens: apiSettings.maxTokens,
          updated_at: new Date().toISOString()
        };
      } else if (settingType === 'azure') {
        settingsData = {
          use_azure: useAzure,
          azure_endpoint_url: azureSettings.endpointUrl,
          azure_deployment_name: azureSettings.deploymentName,
          azure_api_key: azureSettings.apiKey,
          azure_search_endpoint: azureSettings.searchEndpoint,
          azure_search_key: azureSettings.searchKey,
          azure_search_index_name: azureSettings.searchIndexName,
          updated_at: new Date().toISOString()
        };
      } else if (settingType === 'advanced') {
        settingsData = {
          request_template: advancedSettings.requestTemplate,
          updated_at: new Date().toISOString()
        };
      }
      
      if (error || !data) {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            ...settingsData
          }]);
          
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('user_settings')
          .update(settingsData)
          .eq('user_id', user.id);
          
        if (updateError) throw updateError;
      }
      
      toast({
        title: "Settings Saved",
        description: `Your ${settingType} settings have been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddEndpoint = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to add API endpoints.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newEndpoint.name || !newEndpoint.provider) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and provider for the API endpoint.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const endpointData = {
        user_id: user.id,
        name: newEndpoint.name,
        provider: newEndpoint.provider,
        api_endpoint: newEndpoint.api_endpoint || null,
        api_key: newEndpoint.api_key || null,
        model: newEndpoint.model || null,
        is_active: false,
        request_template: advancedSettings.requestTemplate
      };
      
      if (isEditingEndpoint && newEndpoint.id) {
        const { error } = await supabase
          .from('api_endpoints')
          .update({
            name: endpointData.name,
            provider: endpointData.provider,
            api_endpoint: endpointData.api_endpoint,
            api_key: endpointData.api_key,
            model: endpointData.model,
            updated_at: new Date().toISOString(),
            request_template: advancedSettings.requestTemplate
          })
          .eq('id', newEndpoint.id)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        toast({
          title: "API Endpoint Updated",
          description: `"${endpointData.name}" has been updated successfully.`,
        });
      } else {
        const { data, error } = await supabase
          .from('api_endpoints')
          .insert([endpointData])
          .select();
          
        if (error) throw error;
        
        toast({
          title: "API Endpoint Added",
          description: `"${endpointData.name}" has been added successfully.`,
        });
      }
      
      const { data: refreshedData, error: refreshError } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!refreshError && refreshedData) {
        setApiEndpoints(refreshedData);
      }
      
      setNewEndpoint({
        name: '',
        api_endpoint: '',
        api_key: '',
        model: '',
        provider: 'OpenAI'
      });
      setIsAddingEndpoint(false);
      setIsEditingEndpoint(false);
    } catch (error) {
      console.error('Error saving API endpoint:', error);
      toast({
        title: "Error",
        description: "Failed to save API endpoint. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleEditEndpoint = (endpoint: ApiEndpoint) => {
    setNewEndpoint({
      id: endpoint.id,
      name: endpoint.name,
      provider: endpoint.provider,
      api_endpoint: endpoint.api_endpoint || '',
      api_key: endpoint.api_key || '',
      model: endpoint.model || ''
    });
    setIsEditingEndpoint(true);
    setIsAddingEndpoint(true);
  };
  
  const handleDeleteEndpoint = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('api_endpoints')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setApiEndpoints(apiEndpoints.filter(endpoint => endpoint.id !== id));
      
      toast({
        title: "API Endpoint Deleted",
        description: "The API endpoint has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting API endpoint:', error);
      toast({
        title: "Error",
        description: "Failed to delete API endpoint. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleSetActiveEndpoint = async (id: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('api_endpoints')
        .update({ is_active: false })
        .eq('user_id', user.id);
      
      const { error } = await supabase
        .from('api_endpoints')
        .update({ is_active: true })
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      const updatedEndpoints = apiEndpoints.map(endpoint => ({
        ...endpoint,
        is_active: endpoint.id === id
      }));
      
      setApiEndpoints(updatedEndpoints);
      setSelectedEndpointId(id);
      
      const activeEndpoint = updatedEndpoints.find(ep => ep.id === id);
      
      if (activeEndpoint) {
        setApiSettings({
          ...apiSettings,
          endpoint: activeEndpoint.api_endpoint || 'https://api.openai.com/v1',
          apiKey: activeEndpoint.api_key || '',
          model: activeEndpoint.model || 'gpt-4o'
        });
        
        await supabase
          .from('user_settings')
          .update({
            api_endpoint: activeEndpoint.api_endpoint,
            api_key: activeEndpoint.api_key,
            model: activeEndpoint.model,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
      
      toast({
        title: "Active Endpoint Changed",
        description: "Your active API endpoint has been updated.",
      });
    } catch (error) {
      console.error('Error setting active endpoint:', error);
      toast({
        title: "Error",
        description: "Failed to set active endpoint. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleProviderSelect = (providerValue: string) => {
    setNewEndpoint({
      ...newEndpoint,
      provider: providerValue
    });
    
    const providerTemplate = defaultRequestTemplates.find(t => t.provider === providerValue);
    if (providerTemplate) {
      setAdvancedSettings({
        ...advancedSettings,
        requestTemplate: providerTemplate.template
      });
    }
  };
  
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your API keys and application preferences.
            </p>
          </div>
        </div>
        
        <TooltipProvider>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              <TabsTrigger value="endpoints">API Keys & Endpoints</TabsTrigger>
              <TabsTrigger value="azure">Azure</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preferences">
              <PreferencesTab 
                responseSources={responseSources}
                setResponseSources={setResponseSources}
                handleSaveSettings={handleSaveSettings}
                saving={saving}
              />
            </TabsContent>
            
            <TabsContent value="api">
              <APISettingsTab 
                apiSettings={apiSettings}
                setApiSettings={setApiSettings}
                apiEndpoints={apiEndpoints}
                selectedEndpointId={selectedEndpointId}
                setSelectedEndpointId={setSelectedEndpointId}
                modelOptions={modelOptions}
                selectedModel={selectedModel}
                handleEndpointSelect={handleEndpointSelect}
                handleModelSelect={handleModelSelect}
                handleSaveSettings={handleSaveSettings}
                saving={saving}
                newEndpoint={newEndpoint}
                handleProviderSelect={handleProviderSelect}
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
            
            <TabsContent value="azure">
              <AzureTab 
                azureSettings={azureSettings}
                setAzureSettings={setAzureSettings}
                useAzure={useAzure}
                setUseAzure={setUseAzure}
                handleSaveSettings={handleSaveSettings}
                saving={saving}
                showAzureKey={showAzureKey}
                setShowAzureKey={setShowAzureKey}
                showSearchKey={showSearchKey}
                setShowSearchKey={setShowSearchKey}
              />
            </TabsContent>
            
            <TabsContent value="advanced">
              <AdvancedTab 
                advancedSettings={advancedSettings}
                setAdvancedSettings={setAdvancedSettings}
                apiSettings={apiSettings}
                setApiSettings={setApiSettings}
                handleSaveSettings={handleSaveSettings}
                saving={saving}
                newEndpoint={newEndpoint}
              />
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </div>
    </MainLayout>
  );
};

export default Settings;
