
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APISettingsTab } from '@/components/settings/APISettingsTab';
import { PreferencesTab } from '@/components/settings/PreferencesTab';
import { AdvancedTab } from '@/components/settings/AdvancedTab';
import { AzureTab } from '@/components/settings/AzureTab';
import { EndpointsTab } from '@/components/settings/EndpointsTab';
import { useSettingsContext } from '@/contexts/SettingsContext';

export const SettingsTabs: React.FC = () => {
  const {
    apiSettings,
    setApiSettings,
    azureSettings,
    setAzureSettings,
    advancedSettings,
    setAdvancedSettings,
    responseSources,
    setResponseSources,
    apiEndpoints,
    selectedEndpointId,
    newEndpoint,
    isAddingEndpoint,
    setIsAddingEndpoint,
    isEditingEndpoint,
    setIsEditingEndpoint,
    showNewApiKey,
    setShowNewApiKey,
    showAzureKey,
    setShowAzureKey,
    showSearchKey,
    setShowSearchKey,
    activeTab,
    setActiveTab,
    handleProviderSelect,
    handleEndpointSelect,
    handleModelSelect,
    handleAddEndpoint,
    handleEditEndpoint,
    handleDeleteEndpoint,
    handleSetActiveEndpoint,
    handleSaveSettings,
    saving
  } = useSettingsContext();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="api">API</TabsTrigger>
        <TabsTrigger value="azure">Azure</TabsTrigger>
        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      
      <TabsContent value="api">
        <APISettingsTab 
          apiSettings={apiSettings}
          setApiSettings={setApiSettings}
          apiEndpoints={apiEndpoints}
          selectedEndpointId={selectedEndpointId}
          modelOptions={[
            { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' }
          ]}
          selectedModel={apiSettings.model}
          handleEndpointSelect={handleEndpointSelect}
          handleModelSelect={handleModelSelect}
          handleSaveSettings={() => handleSaveSettings('api')}
          saving={saving}
          newEndpoint={newEndpoint}
          handleProviderSelect={handleProviderSelect}
        />
      </TabsContent>
      
      <TabsContent value="azure">
        <AzureTab 
          azureSettings={{
            endpointUrl: azureSettings.endpointUrl,
            deploymentName: azureSettings.deploymentName,
            searchEndpoint: azureSettings.searchEndpoint,
            searchKey: azureSettings.searchKey,
            searchIndexName: azureSettings.searchIndexName,
            apiKey: azureSettings.apiKey
          }}
          setAzureSettings={(settings) => {
            setAzureSettings(prev => ({
              ...prev,
              ...settings
            }));
          }}
          useAzure={azureSettings.useAzure}
          setUseAzure={(value) => {
            const boolValue = typeof value === 'function' ? value(azureSettings.useAzure) : value;
            setAzureSettings(prev => ({
              ...prev,
              useAzure: boolValue
            }));
          }}
          initialValues={{
            useAzure: azureSettings.useAzure,
            azureApiKey: azureSettings.azureApiKey,
            azureEndpointUrl: azureSettings.azureEndpointUrl,
            azureDeploymentName: azureSettings.azureDeploymentName,
            azureSearchEndpoint: azureSettings.azureSearchEndpoint,
            azureSearchKey: azureSettings.azureSearchKey,
            azureSearchIndexName: azureSettings.azureSearchIndexName
          }}
          onSave={(values) => handleSaveSettings('azure')}
          saving={saving}
          showAzureKey={showAzureKey}
          setShowAzureKey={setShowAzureKey}
          showSearchKey={showSearchKey}
          setShowSearchKey={setShowSearchKey}
        />
      </TabsContent>
      
      <TabsContent value="endpoints">
        <EndpointsTab 
          apiEndpoints={apiEndpoints}
          newEndpoint={newEndpoint}
          isAddingEndpoint={isAddingEndpoint}
          setIsAddingEndpoint={setIsAddingEndpoint}
          isEditingEndpoint={isEditingEndpoint}
          setIsEditingEndpoint={setIsEditingEndpoint}
          handleAddEndpoint={handleAddEndpoint}
          handleEditEndpoint={handleEditEndpoint}
          handleDeleteEndpoint={handleDeleteEndpoint}
          handleSetActiveEndpoint={handleSetActiveEndpoint}
          saving={saving}
          showNewApiKey={showNewApiKey}
          setShowNewApiKey={setShowNewApiKey}
        />
      </TabsContent>
      
      <TabsContent value="preferences">
        <PreferencesTab 
          responseSources={responseSources}
          setResponseSources={setResponseSources}
          handleSaveSettings={(values) => handleSaveSettings('preferences')}
          saving={saving}
        />
      </TabsContent>
      
      <TabsContent value="advanced">
        <AdvancedTab 
          advancedSettings={advancedSettings}
          setAdvancedSettings={setAdvancedSettings}
          apiSettings={apiSettings}
          setApiSettings={setApiSettings}
          handleSaveSettings={() => handleSaveSettings('advanced')}
          saving={saving}
          newEndpoint={newEndpoint}
        />
      </TabsContent>
    </Tabs>
  );
};
