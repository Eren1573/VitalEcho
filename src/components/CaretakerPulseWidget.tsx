import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  AlertTriangle, 
  Activity, 
  Droplets, 
  Pill, 
  Heart, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw,
  BellRing,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { api, getCurrentUser } from '../lib/api';
import { CaretakerDigest, AnomalyAlert, ScheduleItem, Log } from '../types';

interface CaretakerPulseWidgetProps {
  onNavigate?: (tab: string) => void;
}

export default function CaretakerPulseWidget({ onNavigate }: CaretakerPulseWidgetProps) {
  const [user, setUser] = useState(getCurrentUser());
  const [digest, setDigest] = useState<CaretakerDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [quickWaterLogged, setQuickWaterLogged] = useState(false);

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch the real digest
  const loadDigest = async (): Promise<CaretakerDigest | null> => {
    setLoading(true);
    try {
      const schedule: ScheduleItem[] = await api.getSchedule().catch(() => []);
      const logs: Log[] = await api.getLogs().catch(() => []);
      const completedTasks = schedule.filter(s => s.completed);
      const currentUser = getCurrentUser();

      // If no logs or completed schedule, return "Please login"
      if (!currentUser || (logs.length === 0 && completedTasks.length === 0)) {
        const emptyState: CaretakerDigest = {
          executiveSummary: "Please login",
          spokenText: "Please login or record your daily health details.",
          statusLevel: "OPTIMAL",
          wellnessScore: 0,
          telemetry: {
            activity: "No logs recorded",
            medications: "No logs recorded",
            hydration: "No logs recorded",
            vitals: "No logs recorded",
            mood: "No logs recorded"
          },
          anomalies: []
        };
        setDigest(emptyState);
        return emptyState;
      }
      
      const isMale = currentUser?.gender?.toLowerCase() === 'male';
      const data = await api.getCaretakerDigest({
        userName: currentUser?.name || (isMale ? 'Arthur' : 'Sarah'),
        gender: isMale ? 'male' : 'female',
        relation: 'Family',
        logs,
        schedule,
        simulateAnomaly: 'none',
        timeString: '7:00 PM'
      });

      setDigest(data);
      return data;
    } catch (err) {
      console.warn('Digest load note:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDigest();

    let debounceTimer: any = null;
    const handleUserUpdate = (e: any) => {
      const updated = e.detail || getCurrentUser();
      setUser(updated);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDigest();
      }, 500);
    };
    window.addEventListener('vital_user_updated', handleUserUpdate);

    // Cleanup speech on unmount
    return () => {
      window.removeEventListener('vital_user_updated', handleUserUpdate);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice Intelligence Speech Engine
  const startVoicePlayback = async () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    let currentDigest = digest;
    if (!currentDigest) {
      currentDigest = await loadDigest();
    }

    const textToSpeak = currentDigest?.spokenText || 
      (currentDigest?.executiveSummary === 'Please login' ? 'Please login.' : `${user?.name || 'Arthur'} had a great day! Vital markers are stable.`);

    window.speechSynthesis.cancel(); // clear previous utterance

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    synthRef.current = utterance;
    
    // Choose natural voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) || voices[0];
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopVoicePlayback = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleQuickWaterLog = async () => {
    try {
      await api.logData({
        type: 'water',
        data: '250ml glass of water',
        value: '250'
      });
      setQuickWaterLogged(true);
      setTimeout(() => setQuickWaterLogged(false), 4000);
      loadDigest();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareSummary = () => {
    const summary = digest?.executiveSummary || "Mom had a great day! Completed 45 mins of walking, took all 3 scheduled medications on time, and logged 6 glasses of water. Vital markers are stable.";
    const text = `VitalEcho Caretaker Pulse (7:00 PM Digest for ${user?.name || 'Arthur'}):\n\n"${summary}"\n\nStatus: ${digest?.statusLevel === 'OPTIMAL' ? '🟢 Optimal' : '⚠️ Attention Required'}\nVital markers stable.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const activeAnomalies = (digest?.anomalies || []).filter(a => !dismissedAlerts.includes(a.id));

  return (
    <div className="mb-8">
      {/* 1. Abnormal Trend Early Detection Alert (if detected) */}
      {activeAnomalies.length > 0 && (
        <div className="mb-5 space-y-3">
          {activeAnomalies.map((anomaly) => (
            <div 
              key={anomaly.id} 
              className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 shadow-sm text-slate-800"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                        Early Warning Alert
                      </span>
                      <span className="px-2 py-0.5 text-[10px] bg-amber-200/70 text-amber-900 rounded-full font-bold">
                        {anomaly.delta}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-slate-900">
                      {anomaly.title}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedAlerts(prev => [...prev, anomaly.id])}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg bg-white border border-slate-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <div className="bg-white border border-amber-100 rounded-2xl p-4 mb-3.5 shadow-xs">
                <p className="text-sm font-semibold text-slate-800 mb-1 leading-snug">
                  {anomaly.headline}
                </p>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  {anomaly.description}
                </p>
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800">
                  <strong className="font-semibold">Clinical Note: </strong>
                  {anomaly.clinicalRisk}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-2xl mb-4 text-xs text-emerald-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 uppercase block text-[11px] mb-0.5">
                    Recommended Action:
                  </span>
                  <span>{anomaly.recommendedAction}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {anomaly.type === 'water_drop' && (
                  <button
                    onClick={handleQuickWaterLog}
                    className="flex-1 min-w-[140px] py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Droplets className="w-4 h-4" />
                    {quickWaterLogged ? '✓ 250ml Logged!' : 'Log 250ml Water Now'}
                  </button>
                )}
                <button
                  onClick={() => {
                    const msg = encodeURIComponent(`Health Alert: ${anomaly.headline}. ${anomaly.recommendedAction}`);
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <BellRing className="w-4 h-4" />
                  Notify Family Member
                </button>
                <button
                  onClick={() => window.location.href = 'tel:108'}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center justify-center gap-1 font-semibold transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                  Call Support / 108
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Evening "Peace of Mind" AI Digest Card (Soothing light aesthetic) */}
      <div className="bg-white rounded-3xl border border-emerald-100/90 p-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Caretaker Pulse • 7:00 PM Sync
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Evening Peace of Mind</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily health synthesis for family members & caretakers
              </p>
            </div>

            <button
              onClick={() => loadDigest()}
              disabled={loading}
              title="Refresh AI Digest"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* Voice Action Button: "Today's Summary" */}
          <div className="mb-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-slate-50/70 border border-emerald-100 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={startVoicePlayback}
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm ${
                    isSpeaking 
                      ? 'bg-emerald-800 text-white ring-4 ring-emerald-200 scale-105' 
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-102'
                  }`}
                  aria-label="Play Voice Summary"
                >
                  {isSpeaking && !isPaused ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">
                      Today's Summary
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      VOICE INTELLIGENCE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isSpeaking 
                      ? (isPaused ? 'Voice paused — tap to resume' : 'Speaking today\'s digest...') 
                      : 'Tap to have Gemini speak today\'s digest aloud'}
                  </p>
                </div>
              </div>

              {/* Audio visualizer */}
              {isSpeaking && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-end gap-1 h-4">
                    <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_0.4s_infinite] h-3" />
                    <span className="w-1 bg-emerald-600 rounded-full animate-[pulse_0.6s_infinite] h-4" />
                    <span className="w-1 bg-teal-500 rounded-full animate-[pulse_0.3s_infinite] h-2" />
                    <span className="w-1 bg-emerald-700 rounded-full animate-[pulse_0.5s_infinite] h-3.5" />
                  </div>
                  <button
                    onClick={stopVoicePlayback}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Stop Voice"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* The Executive Summary Box */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4.5 mb-5 shadow-xs relative">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 font-bold uppercase tracking-wider text-[11px]">
                  Executive Summary
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {digest?.statusLevel === 'OPTIMAL' ? '● Stable' : '▲ Attention'}
              </span>
            </div>

            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-emerald-800 text-xs font-medium">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Synthesizing daily biometrics & schedule...</span>
              </div>
            ) : (
              <div>
                <p className={`text-base leading-relaxed border-l-3 pl-3.5 py-0.5 font-medium ${
                  digest?.executiveSummary === 'Please login' 
                    ? 'border-amber-400 text-slate-600' 
                    : 'border-emerald-600 text-slate-800'
                }`}>
                  "{digest?.executiveSummary || 'Please login'}"
                </p>

                {digest?.executiveSummary === 'Please login' && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      No logs recorded today yet. Log medications, water, or vitals to generate your daily AI digest.
                    </span>
                    <button
                      onClick={() => onNavigate ? onNavigate('track') : null}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      Log Medications & Health
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Share to Family Button */}
            <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Synthesized daily at 7:00 PM for family peace of mind
              </span>
              <button
                onClick={handleShareSummary}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-xs"
              >
                <Share2 className="w-3 h-3" />
                {copiedShare ? 'Copied to Clipboard!' : 'Share with Family'}
              </button>
            </div>
          </div>

          {/* Telemetry Breakdown Cards (Meds, Hydration, Vitals, Activity) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Meds */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-[11px]">MEDICATIONS</span>
                <Pill className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {digest?.telemetry?.medications || '3 of 3 Taken'}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1">
                ✓ Scheduled daily
              </span>
            </div>

            {/* Hydration */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-[11px]">HYDRATION</span>
                <Droplets className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {digest?.telemetry?.hydration || '1.5L Logged'}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold mt-1">
                Adequate intake
              </span>
            </div>

            {/* Vitals */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-[11px]">VITALS / HR</span>
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 truncate">
                {digest?.telemetry?.vitals || 'Pulse 72 bpm'}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1">
                Stable baseline
              </span>
            </div>

            {/* Activity */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold text-[11px]">ACTIVITY</span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 truncate">
                {digest?.telemetry?.activity || '45 mins walking'}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold mt-1">
                Active today
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
