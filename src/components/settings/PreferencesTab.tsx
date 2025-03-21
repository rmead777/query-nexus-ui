
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAutoSavePreference } from '@/hooks/use-auto-save-preference';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';

export interface PreferencesTabProps {
  handleSaveSettings: (newSettings: any) => void;
  saving: boolean;
}

export function PreferencesTab({
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
      citation_style: citationStyle
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
