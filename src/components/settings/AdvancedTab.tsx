
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RequestTemplateEditor } from '@/components/settings/RequestTemplateEditor';
import { Save, Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvancedApiSettings {
  requestTemplate: Record<string, any> | null;
  showAdvanced: boolean;
}

interface ApiSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  instructions: string;
}

interface AdvancedTabProps {
  advancedSettings: AdvancedApiSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedApiSettings>>;
  apiSettings: ApiSettings;
  setApiSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
  handleSaveSettings: (settingType: 'preferences' | 'api' | 'azure' | 'advanced') => Promise<void>;
  saving: boolean;
  newEndpoint: Partial<ApiEndpoint>;
}

import { ApiEndpoint } from '@/types/api';

export const AdvancedTab = ({
  advancedSettings,
  setAdvancedSettings,
  apiSettings,
  setApiSettings,
  handleSaveSettings,
  saving,
  newEndpoint
}: AdvancedTabProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Advanced Model Settings
          </CardTitle>
          <CardDescription>
            Fine-tune AI model behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="temperature-input">Temperature</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Controls randomness: lower values like 0.2 yield focused, deterministic outputs; higher values like 0.8 produce more varied, creative results.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="temperature-input"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={apiSettings.temperature}
                onChange={(e) => setApiSettings({...apiSettings, temperature: parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="max-tokens-input">Max Tokens</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The maximum length of the model's response in tokens (roughly 4 characters per token). Higher values allow longer responses but may cost more.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="max-tokens-input"
                type="number"
                min="100"
                max="32000"
                step="100"
                value={apiSettings.maxTokens}
                onChange={(e) => setApiSettings({...apiSettings, maxTokens: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="instructions-input">System Instructions</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Guidelines that set the AI's behavior and tone. This acts as context for how the AI should respond to all queries.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              id="instructions-input"
              placeholder="You are a helpful assistant that provides accurate and concise information."
              rows={3}
              value={apiSettings.instructions}
              onChange={(e) => setApiSettings({...apiSettings, instructions: e.target.value})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Show Advanced API Template</Label>
              <p className="text-sm text-muted-foreground">
                Customize the API request format for specific model requirements
              </p>
            </div>
            <Switch 
              checked={advancedSettings.showAdvanced}
              onCheckedChange={(checked) => setAdvancedSettings({...advancedSettings, showAdvanced: checked})}
            />
          </div>
          
          {advancedSettings.showAdvanced && (
            <RequestTemplateEditor
              initialValue={advancedSettings.requestTemplate}
              provider={newEndpoint.provider || "OpenAI"}
              onChange={(value) => setAdvancedSettings({...advancedSettings, requestTemplate: value})}
            />
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => handleSaveSettings('advanced')}
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
                Save Advanced Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
