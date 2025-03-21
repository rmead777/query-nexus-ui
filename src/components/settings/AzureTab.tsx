import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info, Save, Loader2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AzureSettings {
  endpointUrl: string;
  deploymentName: string;
  searchEndpoint: string;
  searchKey: string;
  searchIndexName: string;
  apiKey: string;
}

interface AzureTabProps {
  azureSettings: AzureSettings;
  setAzureSettings: React.Dispatch<React.SetStateAction<AzureSettings>>;
  useAzure: boolean;
  setUseAzure: React.Dispatch<React.SetStateAction<boolean>>;
  initialValues: {
    useAzure: boolean;
    azureApiKey: string;
    azureEndpointUrl: string;
    azureDeploymentName: string;
    azureSearchEndpoint: string;
    azureSearchKey: string;
    azureSearchIndexName: string;
  };
  onSave: (values: any) => Promise<void>;
  saving: boolean;
  showAzureKey: boolean;
  setShowAzureKey: React.Dispatch<React.SetStateAction<boolean>>;
  showSearchKey: boolean;
  setShowSearchKey: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AzureTab = ({
  azureSettings,
  setAzureSettings,
  useAzure,
  setUseAzure,
  initialValues,
  onSave,
  saving,
  showAzureKey,
  setShowAzureKey,
  showSearchKey,
  setShowSearchKey
}: AzureTabProps) => {
  const handleSaveSettings = () => {
    onSave({
      useAzure: useAzure,
      azureApiKey: azureSettings.apiKey,
      azureEndpointUrl: azureSettings.endpointUrl,
      azureDeploymentName: azureSettings.deploymentName,
      azureSearchEndpoint: azureSettings.searchEndpoint,
      azureSearchKey: azureSettings.searchKey,
      azureSearchIndexName: azureSettings.searchIndexName
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Azure OpenAI Service
          </CardTitle>
          <CardDescription>
            Configure your Azure OpenAI service settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Use Azure OpenAI</Label>
              <p className="text-sm text-muted-foreground">
                Enable to use Azure OpenAI service instead of OpenAI directly
              </p>
            </div>
            <Switch 
              checked={useAzure}
              onCheckedChange={setUseAzure}
            />
          </div>
          
          {useAzure && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="azure-endpoint">Azure Endpoint URL</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The URL of your Azure OpenAI resource (e.g., https://your-resource-name.openai.azure.com)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="azure-endpoint"
                    value={azureSettings.endpointUrl}
                    onChange={(e) => setAzureSettings({...azureSettings, endpointUrl: e.target.value})}
                    placeholder="https://your-resource-name.openai.azure.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="azure-deployment">Deployment Name</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The name of your deployment within Azure OpenAI. This is the name you chose when deploying a model.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="azure-deployment"
                    value={azureSettings.deploymentName}
                    onChange={(e) => setAzureSettings({...azureSettings, deploymentName: e.target.value})}
                    placeholder="your-deployment-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="azure-api-key">API Key</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your Azure OpenAI API key available in the Azure portal under your resource's Keys and Endpoint section.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <Input
                      id="azure-api-key"
                      type={showAzureKey ? "text" : "password"}
                      value={azureSettings.apiKey}
                      onChange={(e) => setAzureSettings({...azureSettings, apiKey: e.target.value})}
                      placeholder="Your Azure API key"
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
                        {showAzureKey ? "Hide API key" : "Show API key"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Azure Cognitive Search (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="azure-search-endpoint">Search Endpoint</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The URL of your Azure Cognitive Search service (e.g., https://your-search-name.search.windows.net)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="azure-search-endpoint"
                      value={azureSettings.searchEndpoint}
                      onChange={(e) => setAzureSettings({...azureSettings, searchEndpoint: e.target.value})}
                      placeholder="https://your-search-name.search.windows.net"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="azure-search-key">Search API Key</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Your Azure Cognitive Search admin key available in the Azure portal under your search resource's Keys section.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="relative">
                      <Input
                        id="azure-search-key"
                        type={showSearchKey ? "text" : "password"}
                        value={azureSettings.searchKey}
                        onChange={(e) => setAzureSettings({...azureSettings, searchKey: e.target.value})}
                        placeholder="Your Azure Search API key"
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
                          {showSearchKey ? "Hide Search key" : "Show Search key"}
                        </span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="azure-search-index">Search Index Name</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The name of the index in Azure Cognitive Search where your documents are stored.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="azure-search-index"
                      value={azureSettings.searchIndexName}
                      onChange={(e) => setAzureSettings({...azureSettings, searchIndexName: e.target.value})}
                      placeholder="your-search-index-name"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-amber-50 text-amber-600 mt-4">
                <Info className="h-4 w-4" />
                <span>
                  Using Azure OpenAI allows you to leverage enterprise features and comply with your organization's security and compliance requirements.
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveSettings}
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
                Save Azure Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
