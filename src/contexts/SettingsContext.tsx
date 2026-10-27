import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

type SettingsContextType = {
  language: string;
  setLanguage: (l: string) => void;
  textSize: number;
  setTextSize: (s: number) => void;
  aiVoice: string;
  setAiVoice: (v: string) => void;
  theme: string;
  setTheme: (t: string) => void;
  remindersEnabled: boolean;
  setRemindersEnabled: (e: boolean) => void;
  t: (key: string) => string;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'English');
  const [textSize, setTextSize] = useState(parseFloat(localStorage.getItem('textSize') || '1'));
  const [aiVoice, setAiVoice] = useState(localStorage.getItem('voice') || 'Female');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'default');
  const [remindersEnabled, setRemindersEnabledState] = useState(() => {
    return localStorage.getItem('reminders') === 'true';
  });

  const setRemindersEnabled = (enabled: boolean) => {
    setRemindersEnabledState(enabled);
    try {
      localStorage.setItem('reminders', enabled.toString());
      window.dispatchEvent(new CustomEvent('vital_reminders_changed', { detail: enabled }));
    } catch (e) {}
  };

  useEffect(() => {
    localStorage.setItem('lang', language);
    localStorage.setItem('textSize', textSize.toString());
    localStorage.setItem('voice', aiVoice);
    localStorage.setItem('theme', theme);
    localStorage.setItem('reminders', remindersEnabled.toString());

    // Apply text size scaling attribute (handled via CSS overrides)
    document.documentElement.setAttribute('data-text-size', textSize.toString());
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [language, textSize, aiVoice, theme, remindersEnabled]);

  const t = (key: string) => {
    return translations[language]?.[key] || translations['English']?.[key] || key;
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, textSize, setTextSize, aiVoice, setAiVoice, theme, setTheme, remindersEnabled, setRemindersEnabled, t }}>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        :root[data-text-size="1.25"] .text-xs { font-size: 0.9375rem !important; line-height: 1.25rem !important; }
        :root[data-text-size="1.25"] .text-sm { font-size: 1.09375rem !important; line-height: 1.5625rem !important; }
        :root[data-text-size="1.25"] .text-base, :root[data-text-size="1.25"] body { font-size: 1.25rem !important; line-height: 1.875rem !important; }
        :root[data-text-size="1.25"] .text-lg { font-size: 1.40625rem !important; line-height: 2.1875rem !important; }
        :root[data-text-size="1.25"] .text-xl { font-size: 1.5625rem !important; line-height: 2.1875rem !important; }
        :root[data-text-size="1.25"] .text-2xl { font-size: 1.875rem !important; line-height: 2.5rem !important; }
        :root[data-text-size="1.25"] .text-3xl { font-size: 2.34375rem !important; line-height: 2.8125rem !important; }
        :root[data-text-size="1.25"] .text-4xl { font-size: 2.8125rem !important; line-height: 3.125rem !important; }
        :root[data-text-size="1.25"] .prose { font-size: 1.125rem !important; line-height: 1.875rem !important; }
        :root[data-text-size="1.25"] .prose p, :root[data-text-size="1.25"] .prose li { font-size: 1.125rem !important; line-height: 1.875rem !important; }
        
        :root[data-text-size="1.5"] .text-xs { font-size: 1.125rem !important; line-height: 1.5rem !important; }
        :root[data-text-size="1.5"] .text-sm { font-size: 1.3125rem !important; line-height: 1.875rem !important; }
        :root[data-text-size="1.5"] .text-base, :root[data-text-size="1.5"] body { font-size: 1.5rem !important; line-height: 2.25rem !important; }
        :root[data-text-size="1.5"] .text-lg { font-size: 1.6875rem !important; line-height: 2.625rem !important; }
        :root[data-text-size="1.5"] .text-xl { font-size: 1.875rem !important; line-height: 2.625rem !important; }
        :root[data-text-size="1.5"] .text-2xl { font-size: 2.25rem !important; line-height: 3rem !important; }
        :root[data-text-size="1.5"] .text-3xl { font-size: 2.8125rem !important; line-height: 3.375rem !important; }
        :root[data-text-size="1.5"] .text-4xl { font-size: 3.375rem !important; line-height: 3.75rem !important; }
        :root[data-text-size="1.5"] .prose { font-size: 1.25rem !important; line-height: 2.125rem !important; }
        :root[data-text-size="1.5"] .prose p, :root[data-text-size="1.5"] .prose li { font-size: 1.25rem !important; line-height: 2.125rem !important; }
      `}} />
      {theme !== 'default' && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root[data-theme="black-green"] {
            --bg-base: #000000 !important;
            --surface: #0a110a !important;
            --text-main: #4ade80 !important;
            --text-muted: #22c55e !important;
            --border: #14532d !important;
            --emerald-bg: #166534 !important;
          }
          :root[data-theme="black-blue"] {
            --bg-base: #000000 !important;
            --surface: #0a0f1a !important;
            --text-main: #60a5fa !important;
            --text-muted: #3b82f6 !important;
            --border: #1e3a8a !important;
            --emerald-bg: #1e40af !important;
          }
          :root[data-theme="black-green"] *, :root[data-theme="black-blue"] * {
            border-color: var(--border) !important;
          }
          :root[data-theme="black-green"] body, :root[data-theme="black-blue"] body,
          :root[data-theme="black-green"] .bg-\\[\\#F8FAFC\\], :root[data-theme="black-blue"] .bg-\\[\\#F8FAFC\\],
          :root[data-theme="black-green"] .bg-slate-50, :root[data-theme="black-blue"] .bg-slate-50 {
            background-color: var(--bg-base) !important;
          }
          :root[data-theme="black-green"] .bg-white, :root[data-theme="black-blue"] .bg-white,
          :root[data-theme="black-green"] .bg-slate-100, :root[data-theme="black-blue"] .bg-slate-100,
          :root[data-theme="black-green"] .bg-\\[\\#F8F7F3\\], :root[data-theme="black-blue"] .bg-\\[\\#F8F7F3\\] {
            background-color: var(--surface) !important;
          }
          :root[data-theme="black-green"] .text-slate-900, :root[data-theme="black-blue"] .text-slate-900,
          :root[data-theme="black-green"] .text-slate-800, :root[data-theme="black-blue"] .text-slate-800,
          :root[data-theme="black-green"] .text-emerald-900, :root[data-theme="black-blue"] .text-emerald-900,
          :root[data-theme="black-green"] .text-emerald-800, :root[data-theme="black-blue"] .text-emerald-800 {
            color: var(--text-main) !important;
          }
          :root[data-theme="black-green"] .text-slate-500, :root[data-theme="black-blue"] .text-slate-500,
          :root[data-theme="black-green"] .text-slate-600, :root[data-theme="black-blue"] .text-slate-600,
          :root[data-theme="black-green"] .text-slate-400, :root[data-theme="black-blue"] .text-slate-400 {
            color: var(--text-muted) !important;
          }
          :root[data-theme="black-green"] .bg-emerald-800, :root[data-theme="black-blue"] .bg-emerald-800,
          :root[data-theme="black-green"] .bg-emerald-700, :root[data-theme="black-blue"] .bg-emerald-700 {
            background-color: var(--emerald-bg) !important;
            color: var(--text-main) !important;
          }
        `}} />
      )}
    </SettingsContext.Provider>
  );
};
