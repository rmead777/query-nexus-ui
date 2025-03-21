
import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APISettingsTab } from '@/components/settings/APISettingsTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { AdvancedTab } from '@/components/settings/AdvancedTab';
import { AzureTab } from '@/components/settings/AzureTab';
import { EndpointsTab } from '@/components/settings/EndpointsTab';
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from '@/hooks/use-settings';

const Settings = () => {
  const { toast } = useToast();
  const { settings, saveSettings, isLoading } = useSettings();
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (newSettings) => {
    setSaving(true);
    try {
      await saveSettings(newSettings);
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

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="azure">Azure</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api">
            <APISettingsTab 
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="azure">
            <AzureTab 
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="endpoints">
            <EndpointsTab 
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="preferences">
            <PreferencesTab 
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
          
          <TabsContent value="advanced">
            <AdvancedTab 
              handleSaveSettings={handleSaveSettings}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
