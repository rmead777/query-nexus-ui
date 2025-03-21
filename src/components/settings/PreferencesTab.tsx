import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAutoSavePreference } from '@/hooks/use-auto-save-preference';

interface PreferencesTabProps {
  responseSources: {
    useDocuments: boolean;
    useKnowledgeBase: boolean;
    useExternalSearch: boolean;
  };
  setResponseSources: React.Dispatch<React.SetStateAction<{
    useDocuments: boolean;
    useKnowledgeBase: boolean;
    useExternalSearch: boolean;
  }>>;
  handleSaveSettings: () => void;
  saving: boolean;
}

export function PreferencesTab({
  responseSources,
  setResponseSources,
  handleSaveSettings,
  saving
}: PreferencesTabProps) {
  const { autoSave, setAutoSavePreference, isLoaded } = useAutoSavePreference();
  const [showCitations, setShowCitations] = useState(false);
  const [citationStyle, setCitationStyle] = useState("inline");
  
  const handleSave = () => {
    handleSaveSettings();
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
      </CardContent>
    </Card>
  );
}
