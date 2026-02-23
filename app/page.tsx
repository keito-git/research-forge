'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Onboarding from '@/components/Onboarding';
import type { UserProfile } from '@/lib/prompts';

const PROFILE_KEY = 'research-forge-profile';
const APIKEY_KEY = 'research-forge-apikey';
const MODEL_KEY = 'research-forge-model';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      const savedKey = localStorage.getItem(APIKEY_KEY);
      const savedModel = localStorage.getItem(MODEL_KEY);
      if (savedProfile && savedKey) {
        setProfile(JSON.parse(savedProfile));
        setApiKey(savedKey);
      }
      if (savedModel) setModel(savedModel);
    } catch {}
    setLoading(false);
  }, []);

  const handleOnboardingComplete = (newProfile: UserProfile, newApiKey: string) => {
    setProfile(newProfile);
    setApiKey(newApiKey);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(APIKEY_KEY, newApiKey);
    } catch {}
  };

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    try {
      localStorage.setItem(APIKEY_KEY, newKey);
    } catch {}
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    try {
      localStorage.setItem(MODEL_KEY, newModel);
    } catch {}
  };

  const handleResetProfile = () => {
    setProfile(null);
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forge-600 flex items-center justify-center animate-pulse-soft">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-ink-400 font-medium">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!profile || !apiKey) {
    return <Onboarding onComplete={handleOnboardingComplete} initialApiKey={apiKey} />;
  }

  return (
    <ChatInterface
      profile={profile}
      apiKey={apiKey}
      model={model}
      onApiKeyChange={handleApiKeyChange}
      onModelChange={handleModelChange}
      onResetProfile={handleResetProfile}
    />
  );
}
