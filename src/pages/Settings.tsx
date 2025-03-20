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
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiEndpoint } from '@/types/api';

interface ResponseSourceSettings {
  useDocuments: boolean;
  useKnowledgeBase: boolean;
  useExternalSearch: boolean;
}

const Settings = () => {
  const [apiSettings, setApiSettings] = useState({
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024
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
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [useAzure, setUseAzure] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('preferences');
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab && ['preferences', 'api', 'endpoints'].includes(tab)) {
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
            maxTokens: settingsData.max_tokens || 1024
          });
          
          setAzureSettings({
            endpointUrl: settingsData.azure_endpoint_url || '',
            deploymentName: settingsData.azure_deployment_name || '',
            searchEndpoint: settingsData.azure_search_endpoint || '',
            searchKey: settingsData.azure_search_key || '',
            searchIndexName: settingsData.azure_search_index_name || '',
            apiKey: settingsData.azure_api_key || ''
          });
          
          setUseAzure(settingsData.use_azure || false);
          
          if (settingsData.response_sources) {
            const sourcesData = settingsData.response_sources as Record<string, unknown>;
            const typedSources: ResponseSourceSettings = {
              useDocuments: typeof sourcesData.useDocuments === 'boolean' ? sourcesData.useDocuments : true,
              useKnowledgeBase: typeof sourcesData.useKnowledgeBase === 'boolean' ? sourcesData.useKnowledgeBase : true,
              useExternalSearch: typeof sourcesData.useExternalSearch === 'boolean' ? sourcesData.useExternalSearch : false
            };
            setResponseSources(typedSources);
          }
        }
        
        const { data: endpointsData, error: endpointsError } = await supabase
          .from('api_endpoints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (!endpointsError && endpointsData) {
          setApiEndpoints(endpointsData);
          
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
  
  const handleSaveSettings = async (settingType: 'preferences' | 'api' | 'azure') => {
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
        is_active: false
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
            updated_at: new Date().toISOString()
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="api">API Configuration</TabsTrigger>
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
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
                      <Select value={selectedEndpointId || undefined} onValueChange={handleSetActiveEndpoint}>
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
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      value={apiSettings.endpoint}
                      onChange={(e) => setApiSettings({...apiSettings, endpoint: e.target.value})}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={apiSettings.model}
                      onChange={(e) => setApiSettings({...apiSettings, model: e.target.value})}
                      placeholder="gpt-4o"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Required for the application to function</span>
                </div>
                <Button 
                  onClick={() => handleSaveSettings('api')}
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
                      Save Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Azure OpenAI API Integration
                    </CardTitle>
                    <CardDescription>
                      Optional integration with Azure OpenAI API and Cognitive Search.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="use-azure" className="text-sm font-normal">Enable Azure</Label>
                    <Switch
                      id="use-azure"
                      checked={useAzure}
                      onCheckedChange={setUseAzure}
                    />
                  </div>
                </div>
              </CardHeader>
              
              {useAzure && (
                <>
                  <Separator />
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="azure-endpoint-url">ENDPOINT_URL</Label>
                          <Input
                            id="azure-endpoint-url"
                            value={azureSettings.endpointUrl}
                            onChange={(e) => setAzureSettings({...azureSettings, endpointUrl: e.target.value})}
                            placeholder="https://your-resource.openai.azure.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-deployment-name">DEPLOYMENT_NAME</Label>
                          <Input
                            id="azure-deployment-name"
                            value={azureSettings.deploymentName}
                            onChange={(e) => setAzureSettings({...azureSettings, deploymentName: e.target.value})}
                            placeholder="your-deployment"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-api-key">AZURE_OPENAI_API_KEY</Label>
                          <div className="relative">
                            <Input
                              id="azure-api-key"
                              type={showAzureKey ? "text" : "password"}
                              value={azureSettings.apiKey}
                              onChange={(e) => setAzureSettings({...azureSettings, apiKey: e.target.value})}
                              placeholder="Your Azure OpenAI API key"
                              className="pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-10 w-10"
                              onClick={() => setShowAzureKey(!showAzureKey)}
                            >
                              {showAzureKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showAzureKey ? "Hide key" : "Show key"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-endpoint">SEARCH_ENDPOINT</Label>
                          <Input
                            id="azure-search-endpoint"
                            value={azureSettings.searchEndpoint}
                            onChange={(e) => setAzureSettings({...azureSettings, searchEndpoint: e.target.value})}
                            placeholder="https://your-search.search.windows.net"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-key">SEARCH_KEY</Label>
                          <div className="relative">
                            <Input
                              id="azure-search-key"
                              type={showSearchKey ? "text" : "password"}
                              value={azureSettings.searchKey}
                              onChange={(e) => setAzureSettings({...azureSettings, searchKey: e.target.value})}
                              placeholder="Your Azure Cognitive Search key"
                              className="pr-10"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-10 w-10"
                              onClick={() => setShowSearchKey(!showSearchKey)}
                            >
                              {showSearchKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {showSearchKey ? "Hide key" : "Show key"}
                              </span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="azure-search-index">SEARCH_INDEX_NAME</Label>
                          <Input
                            id="azure-search-index"
                            value={azureSettings.searchIndexName}
                            onChange={(e) => setAzureSettings({...azureSettings, searchIndexName: e.target.value})}
                            placeholder="your-search-index"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 text-blue-600">
                      <Info className="h-4 w-4" />
                      <span>
                        Azure integration enables advanced RAG capabilities through Azure Cognitive Search and Azure OpenAI services.
                      </span>
                    </div>
                  </CardContent>
                </>
              )}
              
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={() => handleSaveSettings('azure')} 
                  disabled={!useAzure || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Azure Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="endpoints" className="animate-fade-in space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      API Endpoints
                    </CardTitle>
                    <CardDescription>
                      Manage your API endpoints for different models and providers.
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setNewEndpoint({
                      name: '',
                      api_endpoint: '',
                      api_key: '',
                      model: '',
                      provider: 'OpenAI'
                    });
                    setIsEditingEndpoint(false);
                    setIsAddingEndpoint(true);
                  }} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Endpoint
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingEndpoint ? (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="text-lg font-medium">
                      {isEditingEndpoint ? "Edit API Endpoint" : "Add New API Endpoint"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name">Name</Label>
                        <Input
                          id="new-name"
                          value={newEndpoint.name}
                          onChange={(e) => setNewEndpoint({...newEndpoint, name: e.target.value})}
                          placeholder="My OpenAI Key"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-provider">Provider</Label>
                        <Select 
                          value={newEndpoint.provider} 
                          onValueChange={(value) => setNewEndpoint({...newEndpoint, provider: value})}
                        >
                          <SelectTrigger id="new-provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OpenAI">OpenAI</SelectItem>
                            <SelectItem value="Anthropic">Anthropic</SelectItem>
                            <SelectItem value="Cohere">Cohere</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-endpoint">API Endpoint</Label>
                        <Input
                          id="new-endpoint"
                          value={newEndpoint.api_endpoint}
                          onChange={(e) => setNewEndpoint({...newEndpoint, api_endpoint: e.target.value})}
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-model">Default Model</Label>
                        <Input
                          id="new-model"
                          value={newEndpoint.model}
                          onChange={(e) => setNewEndpoint({...newEndpoint, model: e.target.value})}
                          placeholder="gpt-4o"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="new-api-key">API Key</Label>
                        <div className="relative">
                          <Input
                            id="new-api-key"
                            type={showNewApiKey ? "text" : "password"}
                            value={newEndpoint.api_key}
                            onChange={(e) => setNewEndpoint({...newEndpoint, api_key: e.target.value})}
                            placeholder="Your API key"
                            className="pr-10"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-10 w-10"
                            onClick={() => setShowNewApiKey(!showNewApiKey)}
                          >
                            {showNewApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            <span className="sr-only">
                              {showNewApiKey ? "Hide API key" : "Show API key"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddingEndpoint(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddEndpoint}
                        disabled={saving || !newEndpoint.name}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {isEditingEndpoint ? "Update" : "Save"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : apiEndpoints.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiEndpoints.map(endpoint => (
                        <TableRow key={endpoint.id}>
                          <TableCell className="font-medium">{endpoint.name}</TableCell>
                          <TableCell>{endpoint.provider}</TableCell>
                          <TableCell>{endpoint.model || 'Not set'}</TableCell>
                          <TableCell>
                            {endpoint.is_active ? (
                              <BadgeCheck className="h-5 w-5 text-green-500" />
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSetActiveEndpoint(endpoint.id)}
                              >
                                Set active
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEndpoint(endpoint)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete API Endpoint</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete the "{endpoint.name}" API endpoint? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" className="mr-2">Cancel</Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => handleDeleteEndpoint(endpoint.id)}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No API Endpoints</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first API endpoint to get started.
                    </p>
                    <Button onClick={() => setIsAddingEndpoint(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add API Endpoint
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground flex items-start gap-2 w-full">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Store multiple API endpoints for different models and providers. The active endpoint will be used for API requests.
                    All API keys are encrypted and stored securely.
                  </p>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;

