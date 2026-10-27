import React, { useState, useEffect } from 'react';
import { PhoneCall, Mic, Activity, MapPin } from 'lucide-react';
import { getCurrentUser } from '../lib/api';
import { useSettings } from '../contexts/SettingsContext';
import CaretakerPulseWidget from './CaretakerPulseWidget';
import VitalEchoLogo from './VitalEchoLogo';
import UserAvatar from './UserAvatar';

export default function HomeTab({ onNavigate }: { onNavigate: (tab: string, autoVoice?: boolean) => void }) {
  const [user, setUser] = useState(getCurrentUser());
  const { t } = useSettings();
  const [showSosModal, setShowSosModal] = useState(false);

  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      setUser(e.detail || getCurrentUser());
    };
    window.addEventListener('vital_user_updated', handleUserUpdate);
    return () => window.removeEventListener('vital_user_updated', handleUserUpdate);
  }, []);

  const handleSosConfirm = () => {
    setShowSosModal(false);
    window.location.href = 'tel:108';
  };

  return (
    <div className="p-6">
      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhoneCall className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-center text-slate-900 mb-2">Emergency SOS</h2>
            <p className="text-center text-slate-600 mb-6">Should I call Ambulance - 108?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={handleSosConfirm}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Heart + Echo Wave Logo beside VitalEcho */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2.5">
          <VitalEchoLogo className="w-8 h-8 flex-shrink-0" />
          <span className="font-bold text-xl text-slate-800 tracking-tight">{t('title')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('settings')} 
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all shadow-xs"
            title="Profile & Settings"
          >
             <UserAvatar gender={user?.gender} className="w-full h-full" />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full mb-4">
          #1 Medical AI Worldwide
        </span>
        <h1 className="text-3xl font-extrabold text-emerald-900 leading-tight mb-3">
          {t('hero_title')}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          {t('hero_subtitle')}
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button 
          onClick={() => onNavigate('chat', true)}
          className="col-span-2 bg-emerald-800 hover:bg-emerald-900 text-white p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm transition-colors"
        >
          <Mic className="w-5 h-5" />
          {t('start_voice')}
        </button>
        <button 
          onClick={() => onNavigate('track')}
          className="bg-slate-100 hover:bg-slate-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm transition-colors text-sm"
        >
          <Activity className="w-4 h-4 text-emerald-700" />
          {t('behavioral_report')}
        </button>
        <button 
          onClick={() => setShowSosModal(true)}
          className="bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm transition-colors text-sm">
          <PhoneCall className="w-4 h-4" />
          {t('sos')}
        </button>
        <button 
          onClick={() => onNavigate('clinics')}
          className="col-span-2 bg-blue-50 hover:bg-blue-100 text-blue-800 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm transition-colors text-sm">
          <MapPin className="w-4 h-4" />
          Find Clinics & Pharmacies
        </button>
      </div>

      {/* Caretaker & Family Sync ("Caretaker Pulse") - Moved above Recent Insights as requested */}
      <CaretakerPulseWidget onNavigate={onNavigate} />

      {/* Recent Insights */}
      <div className="mt-8">
        <h3 className="font-bold text-emerald-900 mb-3">{t('recent_insights')}</h3>
        <div className="bg-[#F8F7F3] border border-slate-100 p-6 rounded-2xl text-center shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="font-bold text-emerald-800 mb-2">{t('move_little')}</h4>
            <p className="text-slate-600 text-sm">
              {t('move_desc')}
            </p>
          </div>
          {/* Decorative background circle */}
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-100 rounded-full opacity-50 blur-xl"></div>
        </div>
      </div>
    </div>
  );
}
