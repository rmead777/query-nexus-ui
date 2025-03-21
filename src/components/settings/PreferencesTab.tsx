
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAutoSavePreference } from '@/hooks/use-auto-save-preference';
import { Button } from '@/components/ui/button';
import { useSettings, ResponseSourceSettings } from '@/hooks/use-settings';

export interface PreferencesTabProps {
  responseSources?: ResponseSourceSettings;
  setResponseSources?: React.Dispatch<React.SetStateAction<ResponseSourceSettings>>;
  handleSaveSettings: (newSettings: any) => void;
  saving: boolean;
}

export function PreferencesTab({
  responseSources,
  setResponseSources,
  handleSaveSettings,
  saving
}: PreferencesTabProps) {
  const { autoSave, setAutoSavePreference, isLoaded } = useAutoSavePreference();
  const { settings } = useSettings();
  const [showCitations, setShowCitations] = useState(false);
  const [citationStyle, setCitationStyle] = useState("inline");
  
  useEffect(() => {
    if (settings) {
      setShowCitations(settings.show_citations || false);
      setCitationStyle(settings.citation_style || "inline");
    }
  }, [settings]);
  
  const handleSave = () => {
    const newSettings = {
      auto_save_conversations: autoSave,
      show_citations: showCitations,
      citation_style: citationStyle,
      response_sources: responseSources
    };
    
    handleSaveSettings(newSettings);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Customize your experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-save">Auto Save Conversations</Label>
            <CardDescription>Automatically save conversations to the cloud.</CardDescription>
          </div>
          <Switch 
            id="auto-save" 
            checked={autoSave} 
            onCheckedChange={setAutoSavePreference} 
            disabled={!isLoaded}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-citations">Show Citations</Label>
            <CardDescription>Display citations for AI-generated responses.</CardDescription>
          </div>
          <Switch 
            id="show-citations" 
            checked={showCitations} 
            onCheckedChange={setShowCitations}
          />
        </div>
        
        {showCitations && (
          <div className="mt-4">
            <Label htmlFor="citation-style">Citation Style</Label>
            <select 
              id="citation-style"
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="inline">Inline</option>
              <option value="footnote">Footnote</option>
              <option value="endnote">Endnote</option>
            </select>
          </div>
        )}
        
        {responseSources && setResponseSources && (
          <div className="space-y-3 mt-4">
            <h3 className="text-sm font-medium">Response Sources</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-documents">Use Document Knowledge</Label>
                <CardDescription>Use uploaded documents as knowledge sources.</CardDescription>
              </div>
              <Switch
                id="use-documents"
                checked={responseSources.useDocuments}
                onCheckedChange={(checked) => 
                  setResponseSources(prev => ({ ...prev, useDocuments: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-knowledge-base">Use Knowledge Base</Label>
                <CardDescription>Reference built-in knowledge base.</CardDescription>
              </div>
              <Switch
                id="use-knowledge-base"
                checked={responseSources.useKnowledgeBase}
                onCheckedChange={(checked) => 
                  setResponseSources(prev => ({ ...prev, useKnowledgeBase: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-external-search">Use External Search</Label>
                <CardDescription>Allow AI to search the internet for recent information.</CardDescription>
              </div>
              <Switch
                id="use-external-search"
                checked={responseSources.useExternalSearch}
                onCheckedChange={(checked) => 
                  setResponseSources(prev => ({ ...prev, useExternalSearch: checked }))
                }
              />
            </div>
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
