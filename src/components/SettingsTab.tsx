import React, { useState, useEffect } from 'react';
import { Globe, Accessibility, LogOut, Type, Palette, Bell, User as UserIcon } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { clearAuth, getCurrentUser, api } from '../lib/api';
import UserAvatar, { MaleAvatar, FemaleAvatar } from './UserAvatar';

const CONCERNS_LIST = [
  'PCOS', 'Infertility', 'Early Puberty', 'Breast Cancer', 'Cancer',
  'Thyroid Issues', 'Iron Deficiency', 'Blood Pressure', 'Blood Sugar',
  'Heart Health', 'Sleep Quality', 'Stress & Anxiety', 'Weight Management',
  'NONE'
];

export default function SettingsTab() {
  const { language, setLanguage, textSize, setTextSize, theme, setTheme, remindersEnabled, setRemindersEnabled, t } = useSettings();
  const [user, setUser] = useState(getCurrentUser());
  const [userWeight, setUserWeight] = useState<string>(() => {
    const cur = getCurrentUser();
    return cur?.weight || localStorage.getItem('vital_user_weight') || '';
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editGender, setEditGender] = useState(user?.gender?.toLowerCase() === 'male' ? 'male' : 'female');
  const [editConcerns, setEditConcerns] = useState<string[]>(user?.concerns || []);
  const [editWeight, setEditWeight] = useState(userWeight || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const handleWeightEvent = (e: any) => {
      if (e?.detail) {
        setUserWeight(String(e.detail));
        setEditWeight(String(e.detail));
      }
    };
    const handleUserEvent = (e: any) => {
      const updated = getCurrentUser();
      setUser(updated);
      const w = updated?.weight || (e?.detail && e.detail.weight) || localStorage.getItem('vital_user_weight') || '';
      if (w) {
        setUserWeight(w);
        setEditWeight(w);
      }
    };

    window.addEventListener('vital_weight_updated', handleWeightEvent);
    window.addEventListener('vital_user_updated', handleUserEvent);
    return () => {
      window.removeEventListener('vital_weight_updated', handleWeightEvent);
      window.removeEventListener('vital_user_updated', handleUserEvent);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  const handleToggleConcern = (concern: string) => {
    if (concern === 'NONE') {
      setEditConcerns(prev => prev.includes('NONE') ? [] : ['NONE']);
      return;
    }
    setEditConcerns(prev => 
      prev.includes(concern)
        ? prev.filter(c => c !== concern)
        : [...prev.filter(c => c !== 'NONE'), concern]
    );
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const normalizedGender = editGender.toLowerCase() === 'male' ? 'male' : 'female';
      const cleanWeight = (editWeight || '').trim();
      const formattedWeight = cleanWeight
        ? (cleanWeight.toLowerCase().includes('kg') || cleanWeight.toLowerCase().includes('lb') ? cleanWeight : `${cleanWeight} kg`)
        : '';

      const updatedUser = await api.updateProfile({ 
        name: (editName || '').trim() || 'User', 
        concerns: editConcerns,
        gender: normalizedGender,
        weight: formattedWeight || undefined
      });
      setUser(updatedUser);
      if (formattedWeight) {
        setUserWeight(formattedWeight);
        localStorage.setItem('vital_user_weight', formattedWeight);
      }
      setEditingProfile(false);

      // Notify entire app that user profile & gender have changed
      window.dispatchEvent(new CustomEvent('vital_user_updated', { detail: updatedUser }));
      if (formattedWeight) {
        window.dispatchEvent(new CustomEvent('vital_weight_updated', { detail: formattedWeight }));
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update profile.');
    }
    setSavingProfile(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('settings')}</h1>

      <div className="space-y-6">
        
        {/* Profile */}
        <section>
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Profile & Avatar
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            {!editingProfile ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs flex-shrink-0">
                    <UserAvatar gender={user?.gender} className="w-full h-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">{user?.name || 'User'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        user?.gender?.toLowerCase() === 'male'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-pink-100 text-pink-800 border border-pink-200'
                      }`}>
                        {user?.gender?.toLowerCase() === 'male' ? '♂ Male Profile' : '♀ Female Profile'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>Concerns: {user?.concerns && user.concerns.length > 0 ? user.concerns.join(', ') : 'None selected'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-slate-700">
                        Weight: <span className={userWeight ? 'text-emerald-700 font-bold' : 'text-slate-400 font-normal'}>{userWeight || '--'}</span>
                      </span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditName(user?.name || '');
                    setEditGender(user?.gender?.toLowerCase() === 'male' ? 'male' : 'female');
                    setEditConcerns(user?.concerns || []);
                    setEditWeight(userWeight || '');
                    setEditingProfile(true);
                  }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-600 text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Weight</label>
                    <input 
                      type="text" 
                      value={editWeight}
                      placeholder="e.g. 70 kg"
                      onChange={e => setEditWeight(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-600 text-slate-800 text-sm"
                    />
                  </div>
                </div>

                {/* Profile Avatar / Gender Selection with high-fidelity vector icons */}
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Gender & Avatar Icon <span className="text-xs text-emerald-700 font-normal">(Sets pronouns in daily AI summaries)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Male Option */}
                    <button
                      type="button"
                      onClick={() => setEditGender('male')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        editGender.toLowerCase() === 'male'
                          ? 'border-sky-500 bg-sky-50/80 shadow-sm ring-2 ring-sky-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-13 h-13 rounded-full overflow-hidden flex-shrink-0 shadow-xs">
                        <MaleAvatar className="w-full h-full" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-slate-800">Male</p>
                          <span className="text-xs font-bold text-sky-700">♂</span>
                        </div>
                        <p className="text-xs text-slate-500">He / Him / His</p>
                      </div>
                    </button>

                    {/* Female Option */}
                    <button
                      type="button"
                      onClick={() => setEditGender('female')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        editGender.toLowerCase() === 'female'
                          ? 'border-pink-500 bg-pink-50/80 shadow-sm ring-2 ring-pink-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-13 h-13 rounded-full overflow-hidden flex-shrink-0 shadow-xs">
                        <FemaleAvatar className="w-full h-full" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-slate-800">Female</p>
                          <span className="text-xs font-bold text-pink-700">♀</span>
                        </div>
                        <p className="text-xs text-slate-500">She / Her / Hers</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Health Concerns</label>
                  <div className="flex flex-wrap gap-2">
                    {CONCERNS_LIST.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleToggleConcern(c)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${editConcerns.includes(c) ? 'bg-emerald-100 border-emerald-600 text-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      setEditName(user?.name || '');
                      setEditGender(user?.gender?.toLowerCase() === 'male' ? 'male' : 'female');
                      setEditConcerns(user?.concerns || []);
                      setEditWeight(userWeight || '');
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Languages */}
        <section>
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> {t('language')}
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {['English', 'Hindi', 'Telugu'].map((lang, idx) => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`w-full flex items-center justify-between p-4 text-sm font-medium transition-colors ${idx !== 0 ? 'border-t border-slate-50' : ''} ${language === lang ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {lang}
                {language === lang && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications & Daily Reminders */}
        <section>
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications & Real-Time Reminders
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Daily Reminders</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    remindersEnabled 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {remindersEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 block mt-1">
                  Real-time audio chime alarms & push notifications for scheduled medicine times
                </span>
              </div>
              <button 
                type="button"
                onClick={async () => {
                  const nextState = !remindersEnabled;
                  setRemindersEnabled(nextState);

                  // Request browser push permission if available and state is turned on
                  if (nextState && typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'default') {
                      try {
                        await Notification.requestPermission();
                      } catch (e) {
                        console.warn('Notification permission error:', e);
                      }
                    }
                  }
                }}
                className={`w-13 h-7 rounded-full relative transition-colors shrink-0 ${remindersEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                aria-label="Toggle Daily Reminders"
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${remindersEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                <span>In-app Chimes: <strong className={remindersEnabled ? 'text-emerald-700 font-bold' : 'text-slate-600'}>{remindersEnabled ? 'Active' : 'Off'}</strong></span>
                <span className="mx-2">•</span>
                <span>Push: <strong className="text-slate-700">{typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Always test in-app audio chime first
                  try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                      const ctx = new AudioContextClass();
                      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
                      const now = ctx.currentTime;
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(880, now);
                      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
                      gain.gain.setValueAtTime(0.3, now);
                      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start(now);
                      osc.stop(now + 0.5);
                    }
                  } catch (e) {}

                  // Test system notification if allowed
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                      try {
                        new Notification('VitalEcho Test Alert', {
                          body: 'Real-time medicine reminders & chimes are active!',
                          icon: '/favicon.svg'
                        });
                      } catch (e) {}
                    } else if (Notification.permission === 'default') {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          try {
                            new Notification('VitalEcho Test Alert', {
                              body: 'Real-time medicine reminders & chimes are active!',
                              icon: '/favicon.svg'
                            });
                          } catch (e) {}
                        }
                      }).catch(() => {});
                    }
                  }
                }}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-xs"
              >
                Test Chime & Alert
              </button>
            </div>
          </div>
        </section>

        {/* Accessibility & Customization */}
        <section>
          <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Accessibility className="w-4 h-4" /> {t('accessibility')}
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* Text Size */}
            <div className="p-4 border-b border-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{t('text_size')}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {[1, 1.25, 1.5].map(size => (
                  <button
                    key={size}
                    onClick={() => setTextSize(size)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${textSize === size ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {size === 1 ? t('normal') : `${size}`}
                  </button>
                ))}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-800">{t('demo_text')}: The quick brown fox jumps over the lazy dog.</p>
              </div>
            </div>

            {/* Theme Mode */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{t('theme_mode')}</span>
              </div>
              <div className="flex gap-4 items-center justify-between">
                
                {/* Default Theme */}
                <button onClick={() => setTheme('default')} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full relative flex items-center justify-center border-2 ${theme === 'default' ? 'border-emerald-500' : 'border-slate-200'}`}>
                    <div className="absolute w-6 h-6 rounded-full bg-white border border-slate-200 -ml-3 shadow-sm"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-emerald-500 border border-emerald-600 ml-3 opacity-90 shadow-sm"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{t('normal')}</span>
                </button>

                {/* Black & Green */}
                <button onClick={() => setTheme('black-green')} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full relative flex items-center justify-center border-2 ${theme === 'black-green' ? 'border-green-500' : 'border-slate-200'}`}>
                    <div className="absolute w-6 h-6 rounded-full bg-black -ml-3 shadow-sm z-10 border border-slate-800"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-green-500 ml-3 opacity-90 shadow-sm border border-green-600"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Blk & Grn</span>
                </button>

                {/* Black & Blue */}
                <button onClick={() => setTheme('black-blue')} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full relative flex items-center justify-center border-2 ${theme === 'black-blue' ? 'border-blue-500' : 'border-slate-200'}`}>
                    <div className="absolute w-6 h-6 rounded-full bg-black -ml-3 shadow-sm z-10 border border-slate-800"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-blue-500 ml-3 opacity-90 shadow-sm border border-blue-600"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Blk & Blu</span>
                </button>

              </div>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="pt-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-2xl font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('sign_out')}
          </button>
        </section>
      </div>
    </div>
  );
}
