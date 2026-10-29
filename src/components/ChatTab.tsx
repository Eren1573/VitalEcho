import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Heart, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, getCurrentUser } from '../lib/api';
import { useSettings } from '../contexts/SettingsContext';

export default function ChatTab({ autoStart, onResetAutoStart }: { autoStart?: boolean, onResetAutoStart?: () => void }) {
  const { t, language, setLanguage } = useSettings();
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [command, setCommand] = useState<string>('');
  const [thinking, setThinking] = useState(false);
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const [transcribing, setTranscribing] = useState(false);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setSpeaking(false);
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const safeText = String(text || '');
      const cleanText = safeText.replace(/[*_~`#]/g, '').replace(/\n/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const isTelugu = /[\u0C00-\u0C7F]/.test(cleanText) || language === 'Telugu';
      const isHindi = /[\u0900-\u097F]/.test(cleanText) || language === 'Hindi';

      utterance.lang = isTelugu ? 'te-IN' : isHindi ? 'hi-IN' : 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice = null;
      if (isTelugu) {
        preferredVoice = voices.find(v => v.lang.startsWith('te'));
      } else if (isHindi) {
        preferredVoice = voices.find(v => v.lang.startsWith('hi'));
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(v => 
          v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
        ) || voices[0];
      }
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setSpeaking(false);
    }
  };

  const stopAllRecording = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    setListening(false);
  };

  const startMediaRecordingFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 500) {
          setListening(false);
          setTranscribing(false);
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string) || '';
          try {
            setTranscribing(true);
            const res = await api.transcribeAudio(base64Audio, language);
            if (res?.text && res.text.trim()) {
              setCommand(res.text.trim());
            }
          } catch (e) {
            console.warn("Audio transcribe error:", e);
          } finally {
            setTranscribing(false);
            setListening(false);
          }
        };
      };

      mediaRecorder.start();
      setListening(true);

      // Auto stop after 7 seconds of audio recording
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 7000);
    } catch (e) {
      console.warn("MediaRecorder permission/access error:", e);
      setListening(false);
      setTranscribing(false);
    }
  };

  const handleMicClick = async () => {
    if (speaking) stopSpeaking();
    
    // If currently listening, stop immediately
    if (listening) {
      stopAllRecording();
      return;
    }

    // Try Web Speech API first (instant, real-time live transcription in Chrome/Edge/Safari)
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        
        // Multilingual support: map setting to recognition language code
        const langMap: Record<string, string> = {
          English: 'en-US',
          Hindi: 'hi-IN',
          Telugu: 'te-IN'
        };
        recognition.lang = langMap[language] || 'en-US';

        recognition.onstart = () => {
          setListening(true);
        };

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text) {
            setCommand(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition event error:', event?.error);
          setListening(false);
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
            startMediaRecordingFallback();
          }
        };

        recognition.onend = () => {
          setListening(false);
          recognitionRef.current = null;
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('SpeechRecognition start failed, trying MediaRecorder fallback:', err);
      }
    }

    // Fallback to MediaRecorder + Gemini Transcribe
    await startMediaRecordingFallback();
  };

  const handleSend = async (customText?: string) => {
    const rawInput = customText !== undefined ? customText : command;
    const userText = (rawInput || '').trim();
    if (!userText) return;
    setCommand('');
    setChatLog(prev => [...prev, { role: 'user', text: userText }]);
    setThinking(true);
    
    try {
      const res = await api.extractActions(userText);
      const applied: string[] = [];
      
      if (res?.actions && Array.isArray(res.actions)) {
        for (const action of res.actions) {
          try {
             if (action.type === 'log_vitals' || action.type === 'record_symptom') {
                 await api.logData({ 
                    type: action.type === 'log_vitals' ? 'vitals' : 'symptoms',
                    data: `${action.metric || action.symptom || 'Vitals'}: ${action.value || action.severity || 'Logged'}`
                 });
                 window.dispatchEvent(new CustomEvent('vital_logs_updated'));
                 applied.push(`Logged ${action.metric || action.symptom || 'Vitals'} (${action.value || action.severity || 'Recorded'})`);
             } else if (action.type === 'complete_task') {
                 const schedule = await api.getSchedule();
                 const taskName = String(action.taskName || '').toLowerCase();
                 const task = schedule.find(t => String(t.title || '').toLowerCase().includes(taskName) || taskName.includes(String(t.title || '').toLowerCase()));
                 if (task) {
                     if (!task.completed) await api.toggleTask(task.id);
                     window.dispatchEvent(new CustomEvent('vital_tasks_updated'));
                     window.dispatchEvent(new CustomEvent('vital_logs_updated'));
                     applied.push(`Marked task completed: ${task.title}`);
                 } else {
                     applied.push(`Recorded note for task: ${action.taskName}`);
                 }
             } else if (action.type === 'log_activity') {
                 await api.logData({
                    type: 'activity',
                    data: `${action.activity || 'Activity'}: ${action.duration || '30 mins'}${action.steps ? ` (${action.steps} steps)` : ''}`
                 });
                 try {
                   const actKey = `vital_activities_${user?.userId || 'demo'}`;
                   const existing = JSON.parse(localStorage.getItem(actKey) || '[]');
                   existing.unshift({
                     type: action.activity || 'Activity',
                     duration: action.duration || '30 mins',
                     steps: action.steps || '',
                     timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                   });
                   localStorage.setItem(actKey, JSON.stringify(existing));
                   window.dispatchEvent(new CustomEvent('vital_activity_updated'));
                 } catch (e) {}
                 window.dispatchEvent(new CustomEvent('vital_logs_updated'));
                 applied.push(`Logged activity: ${action.activity || 'Activity'} (${action.duration || '30 mins'})`);
             }
          } catch(err) {
             console.error('Action error:', action, err);
          }
        }
      }

      const reply = await api.chat(userText, 'flash', chatLog, language);
      
      let aiText = reply?.text || reply?.response || (
        language === 'Telugu' 
          ? "నమస్కారం! మీ ఆరోగ్య వివరాలు భద్రపరచబడ్డాయి. నేను మీకు ఎలా సహాయపడగలను?"
          : language === 'Hindi'
          ? "नमस्ते! आपकी स्वास्थ्य जानकारी सुरक्षित दर्ज कर ली गई है। मैं आपकी कैसे मदद कर सकता हूँ?"
          : "I am here to assist you with your health and daily routine. How can I help today?"
      );
      if (applied.length > 0) {
        aiText += `\n\n**Updates saved:**\n- ${applied.join('\n- ')}`;
      }

      setChatLog(prev => [...prev, { role: 'ai', text: aiText }]);
      speakText(aiText);
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'ai', text: "I'm having a brief connection delay, but your local health logs are safe. Please ask again in a moment." }]);
    }
    setThinking(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        handleMicClick();
        if (onResetAutoStart) onResetAutoStart();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatLog, thinking]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Friendly, Clear Header */}
      <div className="bg-white px-5 py-4 border-b border-slate-200/80 shadow-xs z-10 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <Heart className="w-5 h-5 fill-emerald-500/20 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-base leading-tight flex items-center gap-2">
              {t('health_assistant') || 'Health Assistant'}
              <span className="text-sm">😊</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">VitalEcho AI Companion • Ready to listen</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Language Toggle for Elders & Caretakers */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 text-xs">
            {(['English', 'Hindi', 'Telugu'] as const).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  language === lang 
                    ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Switch speaking language to ${lang}`}
              >
                {lang === 'English' ? 'EN' : lang === 'Hindi' ? 'हिन्दी' : 'తెలుగు'}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Online</span>
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Welcoming Greeting State */}
        {chatLog.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 max-w-md mx-auto">
            <div className="relative">
              <div className={`absolute -inset-3 bg-emerald-100 rounded-full blur-xl transition-all duration-700 ${listening ? 'scale-125 opacity-100 animate-pulse' : 'scale-100 opacity-60'}`} />
              <button 
                onClick={handleMicClick}
                className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 ${
                  listening 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white scale-105 shadow-rose-200 ring-4 ring-rose-200' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-105'
                }`}
              >
                {listening ? (
                  <>
                    <MicOff className="w-9 h-9" />
                    <span className="text-[10px] font-bold mt-1 tracking-wide">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-9 h-9" />
                    <span className="text-[10px] font-bold mt-1 tracking-wide">
                      {language === 'Telugu' ? 'మాట్లాడండి' : language === 'Hindi' ? 'बोलें' : 'Tap to Speak'}
                    </span>
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-1.5">
                {language === 'Telugu' ? `నమస్కారం, ${user?.name || 'మిత్రమా'}!` : language === 'Hindi' ? `नमस्ते, ${user?.name || 'मित्र'}!` : `Hello, ${user?.name || 'friend'}!`} 
                <span className="text-2xl">👋</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {language === 'Telugu'
                  ? 'నేను వింటున్నాను. మీ ఆరోగ్యం, వాకింగ్, మందులు లేదా నిద్ర గురించి తెలుగులో మాట్లాడండి లేదా టైప్ చేయండి.'
                  : language === 'Hindi'
                  ? 'मैं सुन रहा हूँ। अपने स्वास्थ्य, वॉक, दवाइयों या दिनचर्या के बारे में हिंदी में बोलें या टाइप करें।'
                  : "I'm listening. You can tell me how you feel, log your activities and vitals, or ask medical questions."}
              </p>
              
              {/* Quick Prompt Pills */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-center">
                {language === 'Telugu' ? (
                  <>
                    <button
                      onClick={() => handleSend("నేను 30 నిమిషాలు వాకింగ్ చేసాను")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "30 నిమిషాలు వాకింగ్ చేసాను"
                    </button>
                    <button
                      onClick={() => handleSend("రక్తపోటు 120/80 నమోదు చేయండి")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "బీపీ 120/80 నమోదు చేయండి"
                    </button>
                    <button
                      onClick={() => handleSend("నేను రాత్రి 8 గంటలు బాగా నిద్రపోయాను")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "8 గంటలు నిద్రపోయాను"
                    </button>
                  </>
                ) : language === 'Hindi' ? (
                  <>
                    <button
                      onClick={() => handleSend("मैंने आज 30 मिनट वॉक किया")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "30 मिनट वॉक किया"
                    </button>
                    <button
                      onClick={() => handleSend("बीपी 120/80 दर्ज करें")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "बीपी 120/80 दर्ज करें"
                    </button>
                    <button
                      onClick={() => handleSend("मुझे 8 घंटे अच्छी नींद आई")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "8 घंटे अच्छी नींद आई"
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSend("Walked for 30 minutes in the morning")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "Walked for 30 minutes"
                    </button>
                    <button
                      onClick={() => handleSend("Log my blood pressure as 120/80")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "Log BP: 120/80"
                    </button>
                    <button
                      onClick={() => handleSend("I slept for 8 hours last night, how is that?")}
                      className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full transition-colors font-medium"
                    >
                      "I slept for 8 hours"
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        {chatLog.map((msg, idx) => (
          <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-xs shadow-sm font-medium' 
                : 'bg-white text-slate-800 rounded-bl-xs shadow-sm border border-slate-200/80'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text || ''}</p>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-headings:text-slate-800 prose-strong:text-emerald-800 prose-ul:my-1.5">
                  <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Mute Voice button placed directly beside the AI message */}
            {msg.role === 'ai' && (
              <div className="flex items-center pb-1 flex-shrink-0">
                {speaking ? (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold shadow-xs transition-all animate-pulse"
                    title="Mute Voice"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                    <span>Mute</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => speakText(msg.text)}
                    className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-full border border-slate-200 hover:border-emerald-200 transition-colors bg-white shadow-2xs"
                    title="Listen to message"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Thinking State */}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-white p-3.5 px-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-200/80 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              <span className="text-xs font-semibold text-slate-500 ml-1.5">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Clean, Bright Input Area with Live Voice Feedback */}
      <div className="bg-white p-3 md:p-4 border-t border-slate-200 shadow-sm z-10">
        {listening && (
          <div className="max-w-3xl mx-auto mb-2.5 flex items-center justify-between px-3.5 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span className="font-semibold">Listening... Speak your message now</span>
            </div>
            <button 
              type="button" 
              onClick={handleMicClick}
              className="text-[11px] font-bold text-rose-600 underline hover:text-rose-800"
            >
              Done speaking
            </button>
          </div>
        )}
        {transcribing && (
          <div className="max-w-3xl mx-auto mb-2.5 flex items-center gap-2 px-3.5 py-1.5 bg-sky-50 border border-sky-200 rounded-full text-xs text-sky-700">
            <div className="w-2 h-2 rounded-full bg-sky-600 animate-bounce" />
            <span className="font-semibold">Transcribing speech with AI...</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-slate-50 p-1.5 pl-4 rounded-full border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <input
            type="text"
            value={command || ''}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={listening ? 'Listening to voice...' : (t('type_voice') || 'Type a message or tap the microphone...')}
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 font-normal"
          />
          <button 
            type="button"
            onClick={handleMicClick}
            className={`p-2.5 rounded-full transition-colors ${
              listening 
                ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-300 animate-pulse' 
                : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200/70'
            }`}
            title={listening ? 'Stop recording' : 'Voice input'}
          >
            {listening ? <Activity className="w-5 h-5 text-rose-600" /> : <Mic className="w-5 h-5" />}
          </button>
          <button 
            type="button"
            onClick={() => handleSend()}
            disabled={!(command || '').trim() || thinking}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all disabled:opacity-40 disabled:hover:bg-emerald-600 shadow-sm active:scale-95"
            title="Send"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
