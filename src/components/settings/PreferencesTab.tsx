
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Info, Save, SettingsIcon, BookOpen, Brain, Search, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface ResponseSourceSettings {
  useDocuments: boolean;
  useKnowledgeBase: boolean;
  useExternalSearch: boolean;
}

interface PreferencesTabProps {
  responseSources: ResponseSourceSettings;
  setResponseSources: React.Dispatch<React.SetStateAction<ResponseSourceSettings>>;
  handleSaveSettings: (settingType: 'preferences' | 'api' | 'azure' | 'advanced') => Promise<void>;
  saving: boolean;
}

export const PreferencesTab = ({
  responseSources,
  setResponseSources,
  handleSaveSettings,
  saving
}: PreferencesTabProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
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
    </div>
  );
};
