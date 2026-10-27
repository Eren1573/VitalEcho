import React, { useState, useEffect } from 'react';
import { Home, Activity, FileText, MessageCircle, Settings as SettingsIcon, MapPin } from 'lucide-react';
import HomeTab from './HomeTab';
import TrackTab from './TrackTab';
import ChatTab from './ChatTab';
import SettingsTab from './SettingsTab';
import RecordsTab from './RecordsTab';
import ClinicsTab from './ClinicsTab';
import { useSettings } from '../contexts/SettingsContext';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const handleNavigate = (tab: string, auto: boolean = false) => { setActiveTab(tab); setAutoStartVoice(auto); };
  
  const { t, remindersEnabled } = useSettings();

  // Request Camera & Audio permissions on site open
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => console.warn('Media permissions denied or unavailable:', err));
    }
  }, []);

  // Daily Schedule & Medication Reminders in real time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let lastCheckedMinute = '';

    const playGlobalChime = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } catch (e) {}
    };

    if (remindersEnabled) {
      interval = setInterval(() => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentMinuteKey = `${now.toDateString()}_${currentHours}:${currentMinutes}`;
        if (lastCheckedMinute === currentMinuteKey) return;

        const format12 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase().replace(/\s/g, '');
        const format24 = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

        // Read user medications from storage
        let meds: any[] = [];
        try {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('vital_meds_'));
          for (const k of keys) {
            const parsed = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(parsed)) meds = [...meds, ...parsed];
          }
        } catch (e) {}

        const dueMeds = meds.filter(m => {
          if (!m.repeatDaily || m.completed) return false;
          const timeNorm = (m.time || '').toLowerCase().replace(/\s/g, '');
          return timeNorm.includes(format12) || (m.time || '').includes(format24);
        });

        if (dueMeds.length > 0) {
          lastCheckedMinute = currentMinuteKey;
          playGlobalChime();
          const medNames = dueMeds.map(m => `${m.name} (${m.dosage})`).join(', ');
          if (window.Notification && Notification.permission === 'granted') {
            try {
              new Notification('🔔 VitalEcho Medication Reminder', {
                body: `It's time to take your medicine: ${medNames}`,
                icon: '/favicon.ico'
              });
            } catch (e) {}
          }
        }
      }, 15000); // checks every 15s
    }
    return () => clearInterval(interval);
  }, [remindersEnabled]);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] w-full relative overflow-hidden font-sans">
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 w-full max-w-7xl mx-auto">
        {activeTab === 'home' && <HomeTab onNavigate={handleNavigate} />}
          {activeTab === 'track' && <TrackTab />}
          {activeTab === 'records' && <RecordsTab />}
          {activeTab === 'chat' && <ChatTab autoStart={autoStartVoice} onResetAutoStart={() => setAutoStartVoice(false)} />}
          {activeTab === 'clinics' && <ClinicsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full h-16 bg-white border-t border-slate-200 flex justify-around items-center px-2 pb-safe z-50">
          <NavButton id="home" icon={Home} label={t('home')} active={activeTab} onClick={setActiveTab} />
          <NavButton id="track" icon={Activity} label={t('track')} active={activeTab} onClick={setActiveTab} />
          <NavButton id="records" icon={FileText} label={t('records')} active={activeTab} onClick={setActiveTab} />
          <NavButton id="chat" icon={MessageCircle} label={t('chat')} active={activeTab} onClick={setActiveTab} />
          <NavButton id="clinics" icon={MapPin} label="Clinics" active={activeTab} onClick={setActiveTab} />
          <NavButton id="settings" icon={SettingsIcon} label={t('settings')} active={activeTab} onClick={setActiveTab} />
        </nav>
    </div>
  );
}

function NavButton({ id, icon: Icon, label, active, onClick }: { id: string, icon: any, label: string, active: string, onClick: (id: string) => void }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <Icon className={`w-5 h-5 mb-1 ${isActive ? 'fill-emerald-100' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
