
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useSettings, ResponseSourceSettings } from '@/hooks/use-settings';
import { ApiEndpoint } from '@/types/api';

// API Settings related types
interface ApiSettingsState {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
}

// Azure Settings related types
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
  apiKey: string;
}

// Advanced Settings related types
interface AdvancedSettingsState {
  temperature: number;
  maxTokens: number;
  instructions: string;
  requestTemplate: Record<string, any> | null;
  showAdvanced: boolean;
}

interface SettingsContextType {
  // Settings states
  apiSettings: ApiSettingsState;
  setApiSettings: React.Dispatch<React.SetStateAction<ApiSettingsState>>;
  azureSettings: AzureSettingsState;
  setAzureSettings: React.Dispatch<React.SetStateAction<AzureSettingsState>>;
  advancedSettings: AdvancedSettingsState;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedSettingsState>>;
  responseSources: ResponseSourceSettings;
  setResponseSources: React.Dispatch<React.SetStateAction<ResponseSourceSettings>>;
  
  // API endpoints management
  apiEndpoints: ApiEndpoint[];
  setApiEndpoints: React.Dispatch<React.SetStateAction<ApiEndpoint[]>>;
  selectedEndpointId: string | null;
  setSelectedEndpointId: React.Dispatch<React.SetStateAction<string | null>>;
  
  // New endpoint management
  newEndpoint: Partial<ApiEndpoint>;
  setNewEndpoint: React.Dispatch<React.SetStateAction<Partial<ApiEndpoint>>>;
  isAddingEndpoint: boolean;
  setIsAddingEndpoint: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingEndpoint: boolean;
  setIsEditingEndpoint: React.Dispatch<React.SetStateAction<boolean>>;
  
  // UI state
  showNewApiKey: boolean;
  setShowNewApiKey: React.Dispatch<React.SetStateAction<boolean>>;
  showAzureKey: boolean;
  setShowAzureKey: React.Dispatch<React.SetStateAction<boolean>>;
  showSearchKey: boolean;
  setShowSearchKey: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  
  // Action handlers
  handleProviderSelect: (provider: string) => void;
  handleEndpointSelect: (endpointId: string) => void;
  handleModelSelect: (model: string) => void;
  handleAddEndpoint: () => Promise<void>;
  handleEditEndpoint: (endpoint: ApiEndpoint) => void;
  handleDeleteEndpoint: (id: string) => Promise<void>;
  handleSetActiveEndpoint: (id: string) => Promise<void>;
  handleSaveSettings: (type: string) => Promise<void>;
  
  // Status
  saving: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { settings, saveSettings, isLoading } = useSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("api");
  
  // Initialize states with default values
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
    apiKey: ''
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
        apiKey: settings.azure_api_key || ''
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

  // Event handlers
  const handleProviderSelect = (provider: string) => {
    setNewEndpoint(prev => ({ ...prev, provider }));
  };

  const handleEndpointSelect = (endpointId: string) => {
    console.log("Selected endpoint:", endpointId);
    setSelectedEndpointId(endpointId);
  };

  const handleModelSelect = (model: string) => {
    setApiSettings(prev => ({ ...prev, model }));
  };
  
  const handleAddEndpoint = async () => {
    console.log("Adding endpoint:", newEndpoint);
    // Implementation would go here
  };
  
  const handleEditEndpoint = (endpoint: ApiEndpoint) => {
    console.log("Editing endpoint:", endpoint);
    setIsEditingEndpoint(true);
    setNewEndpoint(endpoint);
  };
  
  const handleDeleteEndpoint = async (id: string) => {
    console.log("Deleting endpoint:", id);
    // Implementation would go here
  };
  
  const handleSetActiveEndpoint = async (id: string) => {
    console.log("Setting active endpoint:", id);
    // Implementation would go here
  };

  const handleSaveSettings = async (type: string) => {
    setSaving(true);
    try {
      let settingsToSave = {};
      
      if (type === 'api') {
        settingsToSave = {
          api_key: apiSettings.apiKey,
          api_endpoint: apiSettings.apiEndpoint,
          model: apiSettings.model
        };
      } else if (type === 'azure') {
        settingsToSave = {
          use_azure: azureSettings.useAzure,
          azure_api_key: azureSettings.apiKey,
          azure_endpoint_url: azureSettings.endpointUrl,
          azure_deployment_name: azureSettings.deploymentName,
          azure_search_endpoint: azureSettings.searchEndpoint,
          azure_search_key: azureSettings.searchKey,
          azure_search_index_name: azureSettings.searchIndexName
        };
      } else if (type === 'advanced') {
        settingsToSave = {
          temperature: advancedSettings.temperature,
          max_tokens: advancedSettings.maxTokens,
          instructions: advancedSettings.instructions
        };
      } else if (type === 'preferences') {
        settingsToSave = {
          auto_save_conversations: true, // This would come from the preferences tab
          show_citations: true, // This would come from the preferences tab
          citation_style: "inline", // This would come from the preferences tab
          response_sources: responseSources
        };
      }
      
      await saveSettings(settingsToSave);
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

  const contextValue: SettingsContextType = {
    apiSettings,
    setApiSettings,
    azureSettings,
    setAzureSettings,
    advancedSettings,
    setAdvancedSettings,
    responseSources,
    setResponseSources,
    apiEndpoints,
    setApiEndpoints,
    selectedEndpointId,
    setSelectedEndpointId,
    newEndpoint,
    setNewEndpoint,
    isAddingEndpoint,
    setIsAddingEndpoint,
    isEditingEndpoint,
    setIsEditingEndpoint,
    showNewApiKey,
    setShowNewApiKey,
    showAzureKey,
    setShowAzureKey,
    showSearchKey,
    setShowSearchKey,
    activeTab,
    setActiveTab,
    handleProviderSelect,
    handleEndpointSelect,
    handleModelSelect,
    handleAddEndpoint,
    handleEditEndpoint,
    handleDeleteEndpoint,
    handleSetActiveEndpoint,
    handleSaveSettings,
    saving
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettingsContext must be used within a SettingsProvider");
  }
  return context;
};
