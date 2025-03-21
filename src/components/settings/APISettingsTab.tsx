import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiEndpoint, ModelOption } from '@/types/api';
import { Eye, EyeOff, Save, Loader2, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ApiSettings {
  endpoint: string;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
}

export interface APISettingsTabProps {
  apiSettings: ApiSettings;
  setApiSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
  apiEndpoints: ApiEndpoint[];
  selectedEndpointId: string | null;
  modelOptions: ModelOption[];
  selectedModel: string | null;
  handleEndpointSelect: (endpointId: string) => void;
  handleModelSelect: (modelValue: string) => void;
  handleSaveSettings: (settingType: 'preferences' | 'api' | 'azure' | 'advanced') => Promise<void> | void;
  saving: boolean;
  newEndpoint: Partial<ApiEndpoint>;
  handleProviderSelect: (providerValue: string) => void;
}

export const APISettingsTab = ({
  apiSettings,
  setApiSettings,
  apiEndpoints,
  selectedEndpointId,
  modelOptions,
  selectedModel,
  handleEndpointSelect,
  handleModelSelect,
  handleSaveSettings,
  saving,
  newEndpoint,
  handleProviderSelect
}: APISettingsTabProps) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
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
                value={apiSettings.apiEndpoint}
                onChange={(e) => setApiSettings({...apiSettings, apiEndpoint: e.target.value})}
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
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => handleSaveSettings('api')}
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
                Save API Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
