import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BadgeCheck, 
  Info, 
  KeyRound, 
  Save, 
  Settings as SettingsIcon,
  BookOpen,
  Brain,
  Search,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Check,
  HelpCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiEndpoint, ModelOption } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { RequestTemplateEditor } from '@/components/settings/RequestTemplateEditor';
import { defaultRequestTemplates, RequestTemplate } from '@/types/api';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    
    if (tab && ['preferences', 'api', 'endpoints', 'advanced'].includes(tab)) {
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
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              <TabsTrigger value="endpoints">API Keys & Endpoints</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preferences" className="animate-fade-in space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Application Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your application experience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Auto-save conversations</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically save your conversations for future reference
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Show sources by default</Label>
                        <p className="text-sm text-muted-foreground">
                          Always show the sources panel when available
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Citations in responses</Label>
                        <p className="text-sm text-muted-foreground">
                          Include citation references in AI responses
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleSaveSettings('preferences')}
                    className="ml-auto"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    AI Response Sources
                  </CardTitle>
                  <CardDescription>
                    Control where the AI should source information for responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="use-documents" 
                        checked={responseSources.useDocuments}
                        onCheckedChange={(checked) => 
                          setResponseSources({...responseSources, useDocuments: checked === true})}
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor="use-documents" 
                          className="text-base font-medium flex items-center gap-1.5"
                        >
                          <BookOpen className="h-4 w-4" />
                          Uploaded Documents
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Limit responses to information found in the uploaded or saved documents only
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="use-knowledge-base" 
                        checked={responseSources.useKnowledgeBase}
                        onCheckedChange={(checked) => 
                          setResponseSources({...responseSources, useKnowledgeBase: checked === true})}
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor="use-knowledge-base" 
                          className="text-base font-medium flex items-center gap-1.5"
                        >
                          <Brain className="h-4 w-4" />
                          AI Knowledge Base
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow the AI to use its pre-trained knowledge to answer questions
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="use-external-search" 
                        checked={responseSources.useExternalSearch}
                        onCheckedChange={(checked) => 
                          setResponseSources({...responseSources, useExternalSearch: checked === true})}
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor="use-external-search" 
                          className="text-base font-medium flex items-center gap-1.5"
                        >
                          <Search className="h-4 w-4" />
                          External Search
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Allow the AI to search for additional information from external sources
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 text-blue-600">
                    <Info className="h-4 w-4" />
                    <span>
                      Using multiple sources provides more comprehensive responses, but may increase response time.
                      For the most accurate document-specific answers, enable "Uploaded Documents" only.
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleSaveSettings('preferences')}
                    className="ml-auto"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Source Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="api" className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Active API Settings
                      </CardTitle>
                      <CardDescription>
                        Configure your active language model API settings.
                      </CardDescription>
                    </div>
                    {apiEndpoints.length > 0 && (
                      <div>
                        <Select 
                          value={selectedEndpointId || undefined} 
                          onValueChange={(value) => {
                            setSelectedEndpointId(value);
                            handleEndpointSelect(value);
                          }}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select API endpoint" />
                          </SelectTrigger>
                          <SelectContent>
                            {apiEndpoints.map(endpoint => (
                              <SelectItem key={endpoint.id} value={endpoint.id}>
                                {endpoint.name} {endpoint.is_active && <Check className="inline-block h-4 w-4 ml-1" />}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="provider-select">Provider</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select the company that provides the AI model (e.g., OpenAI, Anthropic). This determines the API endpoint format and available models.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        value={newEndpoint.provider}
                        onValueChange={handleProviderSelect}
                      >
                        <SelectTrigger id="provider-select">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OpenAI">OpenAI</SelectItem>
                          <SelectItem value="Anthropic">Anthropic</SelectItem>
                          <SelectItem value="Google">Google (Gemini)</SelectItem>
                          <SelectItem value="Cohere">Cohere</SelectItem>
                          <SelectItem value="Custom">Custom Provider</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="model-select">Model</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The specific AI model to use. Different models have varying capabilities, token limits, and pricing. More advanced models (like GPT-4o) generally provide better responses but cost more.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        value={selectedModel || undefined}
                        onValueChange={handleModelSelect}
                      >
                        <SelectTrigger id="model-select">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {modelOptions.map(model => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="api-endpoint">API Endpoint</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The URL where API requests are sent. For most providers, the default endpoint works, but you can customize it for enterprise accounts or proxy services. Typically ends with /v1 for OpenAI.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="api-endpoint"
                        value={apiSettings.endpoint}
                        onChange={(e) => setApiSettings({...apiSettings, endpoint: e.target.value})}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="api-key">API Key</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Your authentication key for the AI service. Keep this secret as it grants access to paid API services. You can get this from your provider's dashboard.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? "text" : "password"}
                          value={apiSettings.apiKey}
                          onChange={(e) => setApiSettings({...apiSettings, apiKey: e.target.value})}
                          placeholder="Your API key"
                          className="pr-10"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-10 w-10"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {showApiKey ? "Hide API key" : "Show API key"}
                          </span>
                        </Button>
                      </div>
