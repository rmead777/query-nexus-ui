
import React, { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLocation } from 'react-router-dom';
import { SettingsProvider, useSettingsContext } from '@/contexts/SettingsContext';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

const SettingsContent = () => {
  const { setActiveTab } = useSettingsContext();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['api', 'azure', 'endpoints', 'preferences', 'advanced'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location, setActiveTab]);

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <SettingsTabs />
    </div>
  );
};

const Settings = () => {
  return (
    <MainLayout>
      <SettingsProvider>
        <SettingsContent />
      </SettingsProvider>
    </MainLayout>
  );
};

export default Settings;
