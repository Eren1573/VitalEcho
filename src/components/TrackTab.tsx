import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Droplet, 
  Moon, 
  Scale, 
  Smile, 
  Thermometer, 
  Heart, 
  Plus, 
  Mic, 
  Edit3, 
  CheckCircle2, 
  Circle, 
  X, 
  Camera, 
  Calendar, 
  Bell, 
  RotateCcw, 
  Scan,
  Pill as PillIcon,
  BellRing,
  Volume2,
  Trash2,
  Check,
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSettings } from '../contexts/SettingsContext';
import { api, getAuthToken, getCurrentUser } from '../lib/api';
import { ScheduleItem } from '../types';

export interface MedicationItem {
  id: string | number;
  name: string;
  dosage: string;
  time: string;
  instructions: string;
  repeatDaily: boolean;
  completed: boolean;
  takenAt?: string;
}

const MOCK_ACTIVITY = {
  Week: [ { day: 'Mon', value: 45 }, { day: 'Tue', value: 30 }, { day: 'Wed', value: 60 }, { day: 'Thu', value: 20 }, { day: 'Fri', value: 80 }, { day: 'Sat', value: 65 }, { day: 'Sun', value: 50 } ],
  Month: [ { day: 'W1', value: 250 }, { day: 'W2', value: 300 }, { day: 'W3', value: 280 }, { day: 'W4', value: 350 } ],
  All: [ { day: 'Jan', value: 900 }, { day: 'Feb', value: 1100 }, { day: 'Mar', value: 1050 }, { day: 'Apr', value: 1200 }, { day: 'May', value: 1150 } ]
};

const MOCK_SLEEP = {
  Week: [ { day: 'Mon', value: 7 }, { day: 'Tue', value: 6.5 }, { day: 'Wed', value: 8 }, { day: 'Thu', value: 5.5 }, { day: 'Fri', value: 7.5 }, { day: 'Sat', value: 9 }, { day: 'Sun', value: 8.5 } ],
  Month: [ { day: 'W1', value: 48 }, { day: 'W2', value: 50 }, { day: 'W3', value: 45 }, { day: 'W4', value: 52 } ],
  All: [ { day: 'Jan', value: 200 }, { day: 'Feb', value: 195 }, { day: 'Mar', value: 210 }, { day: 'Apr', value: 205 }, { day: 'May', value: 215 } ]
};

export default function TrackTab() {
  const { t, remindersEnabled, setRemindersEnabled } = useSettings();
  const [timeframe, setTimeframe] = useState('Week');
  const [metric, setMetric] = useState('Activity');
  const [fabOpen, setFabOpen] = useState(false);
  
  // Modals state
  const [sleepModal, setSleepModal] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepComment, setSleepComment] = useState('');
  const [loadingSleep, setLoadingSleep] = useState(false);

  const [weightModal, setWeightModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [toast, setToast] = useState('');
  
  const [waterModal, setWaterModal] = useState(false);
  const [waterAmount, setWaterAmount] = useState('');
  const [waterUnit, setWaterUnit] = useState('glasses');
  
  const [symptomsModal, setSymptomsModal] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  
  const [vitalsModal, setVitalsModal] = useState(false);
  const [bloodSugar, setBloodSugar] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');

  const [moodModal, setMoodModal] = useState(false);
  const [moodResult, setMoodResult] = useState('');
  const [loadingMood, setLoadingMood] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Medication Tracking & Everyday Reminder State
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [medicationModal, setMedicationModal] = useState(false);
  const [quickMedModal, setQuickMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00 AM');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedRepeatDaily, setNewMedRepeatDaily] = useState(true);
  const [testingChime, setTestingChime] = useState(false);

  // Reminder State
  const [reminderModal, setReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderCategory, setReminderCategory] = useState('Medication');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState(false);
  const [loadingReminder, setLoadingReminder] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice Log State
  const [voiceModal, setVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loadingVoice, setLoadingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Manual Text State
  const [manualModal, setManualModal] = useState(false);
  const [manualText, setManualText] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);

  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchLogs();
    loadMedications();
  }, []);

  const loadMedications = () => {
    const uid = getAuthToken() || 'guest';
    try {
      const saved = localStorage.getItem(`vital_meds_${uid}`);
      if (saved) {
        setMedications(JSON.parse(saved));
        return;
      }
    } catch (e) {}

    const defaults: MedicationItem[] = [
      {
        id: 'med_default_1',
        name: 'Metformin',
        dosage: '500mg (1 tablet)',
        time: '08:00 AM',
        instructions: 'Take with breakfast',
        repeatDaily: true,
        completed: false
      },
      {
        id: 'med_default_2',
        name: 'Lisinopril',
        dosage: '10mg',
        time: '01:00 PM',
        instructions: 'Blood pressure maintenance',
        repeatDaily: true,
        completed: false
      },
      {
        id: 'med_default_3',
        name: 'Atorvastatin',
        dosage: '20mg',
        time: '08:00 PM',
        instructions: 'Evening cholesterol control',
        repeatDaily: true,
        completed: false
      }
    ];
    setMedications(defaults);
    try {
      localStorage.setItem(`vital_meds_${uid}`, JSON.stringify(defaults));
    } catch (e) {}
  };

  const saveMedicationsToStorage = (updated: MedicationItem[]) => {
    const uid = getAuthToken() || 'guest';
    try {
      localStorage.setItem(`vital_meds_${uid}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Web Audio medical chime generator
  const playReminderChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
      
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.18);
      gain2.gain.setValueAtTime(0.25, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  };

  // Everyday reminder alert tester
  const handleTestEverydayReminder = async () => {
    setTestingChime(true);
    playReminderChime();

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification('🔔 VitalEcho Everyday Reminder', {
              body: 'Time to take scheduled medications: Metformin (08:00 AM) & Lisinopril (01:00 PM)',
              icon: '/favicon.svg'
            });
          }
        } catch (e) {}
      } else if (Notification.permission === 'granted') {
        try {
          new Notification('🔔 VitalEcho Everyday Reminder', {
            body: 'Time to take scheduled medications: Metformin (08:00 AM) & Lisinopril (01:00 PM)',
            icon: '/favicon.svg'
          });
        } catch (e) {}
      }
    }

    setToast('🔔 Everyday Reminder Alert Tested: Chime & Notification Fired!');
    setTimeout(() => {
      setTestingChime(false);
      setToast('');
    }, 3500);
  };

  // Real-time medication reminders & alarms background runner
  useEffect(() => {
    if (!remindersEnabled) return;

    let lastTriggeredMinute = '';

    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentMinuteKey = `${now.toDateString()}_${currentHours}:${currentMinutes}`;
      if (lastTriggeredMinute === currentMinuteKey) return;

      const format12 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase().replace(/\s/g, '');
      const format24 = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

      // Check medications scheduled for everyday reminder
      const dueMeds = medications.filter(m => {
        if (!m.repeatDaily || m.completed) return false;
        const medTimeNorm = (m.time || '').toLowerCase().replace(/\s/g, '');
        return medTimeNorm.includes(format12) || (m.time || '').includes(format24);
      });

      if (dueMeds.length > 0) {
        lastTriggeredMinute = currentMinuteKey;
        playReminderChime();
        const medNames = dueMeds.map(m => `${m.name} (${m.dosage})`).join(', ');
        setToast(`🔔 Scheduled Medicine Reminder: ${medNames}`);
        setTimeout(() => setToast(''), 6000);

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 Time for Your Medicine!', {
              body: `It's time to take: ${medNames}. Tap to mark as taken.`,
              icon: '/favicon.svg'
            });
          } catch (e) {}
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000); // Check every 15s in real time
    return () => clearInterval(interval);
  }, [remindersEnabled, medications]);

  // Toggle medication taken state
  const toggleMedication = async (medId: string | number) => {
    const updated = medications.map(med => {
      if (String(med.id) === String(medId)) {
        const willBeCompleted = !med.completed;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          ...med,
          completed: willBeCompleted,
          takenAt: willBeCompleted ? nowTime : undefined
        };
      }
      return med;
    });
    setMedications(updated);
    saveMedicationsToStorage(updated);

    const target = updated.find(m => String(m.id) === String(medId));
    if (target && target.completed) {
      try {
        await api.logData({
          type: 'medication',
          data: `Took ${target.name} (${target.dosage}) at ${target.takenAt || target.time}`,
          value: target.name
        });
        fetchLogs();
        setToast(`✓ ${target.name} logged as taken!`);
        setTimeout(() => setToast(''), 3000);
      } catch (e) {}
    } else if (target && !target.completed) {
      setToast(`Marked ${target.name} as pending`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Add new prescription
  const handleAddMedication = async () => {
    if (!(newMedName || '').trim()) return;
    const newMed: MedicationItem = {
      id: 'med_' + Date.now(),
      name: (newMedName || '').trim(),
      dosage: (newMedDosage || '').trim() || '1 dose',
      time: newMedTime || '08:00 AM',
      instructions: (newMedInstructions || '').trim() || 'Take with water',
      repeatDaily: newMedRepeatDaily,
      completed: false
    };

    const updated = [...medications, newMed];
    setMedications(updated);
    saveMedicationsToStorage(updated);

    try {
      await api.addTask({
        title: `${newMed.name} (${newMed.dosage})`,
        time: newMed.time,
        notes: newMed.instructions,
        category: 'Medication',
        repeatDaily: newMed.repeatDaily
      });
      fetchTasks();
    } catch (e) {}

    setNewMedName('');
    setNewMedDosage('');
    setNewMedTime('08:00 AM');
    setNewMedInstructions('');
    setNewMedRepeatDaily(true);
    setMedicationModal(false);

    setToast(`Added ${newMed.name} to Daily Schedule!`);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleMedRepeatDaily = (medId: string | number) => {
    const updated = medications.map(m => {
      if (String(m.id) === String(medId)) {
        return { ...m, repeatDaily: !m.repeatDaily };
      }
      return m;
    });
    setMedications(updated);
    saveMedicationsToStorage(updated);
    setToast('Everyday reminder preference updated');
    setTimeout(() => setToast(''), 2500);
  };

  const deleteMedication = (medId: string | number) => {
    const updated = medications.filter(m => String(m.id) !== String(medId));
    setMedications(updated);
    saveMedicationsToStorage(updated);
    setToast('Medication removed from list');
    setTimeout(() => setToast(''), 2500);
  };

  const fetchTasks = async () => {
    try {
      const schedule = await api.getSchedule();
      setTasks(schedule);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const recentLogs = await api.getLogs();
      setLogs(recentLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    try {
      await api.toggleTask(id);
    } catch (e) {
      fetchTasks(); // revert on failure
    }
  };

  const chartData = metric === 'Sleep' ? MOCK_SLEEP[timeframe as keyof typeof MOCK_SLEEP] : MOCK_ACTIVITY[timeframe as keyof typeof MOCK_ACTIVITY];
  const lineColor = metric === 'Sleep' ? '#3B82F6' : '#059669';

  const handleReminderSubmit = async () => {
    if (!(reminderTitle || '').trim() || !reminderTime) return;
    setLoadingReminder(true);
    try {
      // Format time for display (e.g., 2:00 PM)
      const date = new Date(reminderTime);
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newReminder: Partial<ScheduleItem> = {
        title: (reminderTitle || '').trim(),
        time: timeString,
        notes: (reminderNotes || '').trim(),
        category: reminderCategory,
        repeatDaily: reminderRepeat
      };
      
      await api.addTask(newReminder);
      
      // Update local state
      fetchTasks();
      
      // Reset
      setReminderTitle('');
      setReminderNotes('');
      setReminderCategory('Medication');
      setReminderTime('');
      setReminderRepeat(false);
      setReminderModal(false);
      
      setToast('Reminder created');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error(e);
      setToast('Failed to create reminder');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoadingReminder(false);
    }
  };

  const handleSleepSubmit = async () => {
    if (!sleepHours) return;
    setLoadingSleep(true);
    
    const hours = Number(sleepHours);
    const currentUser = getCurrentUser();
    let comment = hours === 8
      ? "Eight hours is optimal for recovery. Maintain this consistent bedtime habit."
      : hours < 7
      ? "Below recommended 7-8 hours. Try winding down 30 minutes earlier tonight."
      : "Adequate rest logged. Keep hydration steady upon waking.";

    try {
      const res = await api.analyzeSleep(hours, currentUser?.gender);
      if (res?.comment) {
        comment = res.comment;
      }
    } catch (e) {}

    setSleepComment(comment);
    try {
      await api.logData({ type: 'sleep', data: hours });
      fetchLogs();
    } catch (e) {}
    
    setLoadingSleep(false);
    setToast('Sleep logged successfully');
    setTimeout(() => setToast(''), 3000);
  };

  const handleWeightSubmit = async () => {
    if (!weight) return;
    try {
      const cleanWeight = String(weight).trim();
      const formattedWeight = cleanWeight.toLowerCase().includes('kg') || cleanWeight.toLowerCase().includes('lb')
        ? cleanWeight
        : `${cleanWeight} kg`;

      await api.logData({ type: 'weight', data: formattedWeight });
      
      // Persist to user profile and localStorage
      localStorage.setItem('vital_user_weight', formattedWeight);
      try {
        await api.updateProfile({ weight: formattedWeight });
      } catch (err) {}

      // Dispatch real-time updates for Settings tab and other components
      window.dispatchEvent(new CustomEvent('vital_weight_updated', { detail: formattedWeight }));
      window.dispatchEvent(new CustomEvent('vital_user_updated', { detail: { weight: formattedWeight } }));

      fetchLogs();
    } catch (e) {}
    setWeightModal(false);
    setWeight('');
    setToast('Weight saved successfully');
    setTimeout(() => setToast(''), 3000);
  };

  const handleWaterSubmit = async () => {
    if (!waterAmount) return;
    try {
      const dataStr = `${waterAmount} ${waterUnit}`;
      await api.logData({ type: 'water', data: dataStr });
      fetchLogs();
    } catch (e) {}
    setWaterModal(false);
    setWaterAmount('');
    setToast(`Logged ${waterAmount} ${waterUnit} of water`);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSymptomsSubmit = async () => {
    if (!symptomText) return;
    try {
      await api.logData({ type: 'symptom', data: symptomText });
      fetchLogs();
    } catch (e) {}
    setSymptomsModal(false);
    setSymptomText('');
    setToast('Symptoms logged successfully');
    setTimeout(() => setToast(''), 3000);
  };

  const handleVitalsSubmit = async () => {
    if (!bloodSugar && !bloodPressure && !heartRate) return;
    try {
      await api.logData({ type: 'vitals', data: { bloodSugar, bloodPressure, heartRate } });
      fetchLogs();
    } catch (e) {}
    setVitalsModal(false);
    setBloodSugar('');
    setBloodPressure('');
    setHeartRate('');
    setToast('Vitals logged successfully');
    setTimeout(() => setToast(''), 3000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      console.error("Camera error:", e);
      setToast("Camera access denied. Please allow camera permissions in your browser or refresh the page.");
      setTimeout(() => setToast(''), 4000);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const openMoodModal = () => {
    setMoodModal(true);
    setMoodResult('');
    setCapturedFaceImage(null);
    setLoadingMood(false);
    startCamera();
  };

  const closeMoodModal = () => {
    stopCamera();
    setMoodModal(false);
    setCapturedFaceImage(null);
    setMoodResult('');
    setLoadingMood(false);
  };

  const retakeFace = () => {
    setMoodResult('');
    setCapturedFaceImage(null);
    setLoadingMood(false);
    startCamera();
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.92);
      
      // Immediately freeze photo and trigger shutter flash
      setCapturedFaceImage(base64Image);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      // Stop camera stream immediately to conserve power and turn off webcam LED
      stopCamera();
      
      setLoadingMood(true);
      try {
        const res = await api.analyzeFace(base64Image);
        setMoodResult(res.analysis);
      } catch (e) {
        setMoodResult('Failed to analyze facial biomarkers. Please ensure good lighting and tap Retake to try again.');
      } finally {
        setLoadingMood(false);
      }
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            setLoadingVoice(true);
            setTranscript("Transcribing...");
            const res = await api.transcribeAudio(base64Audio);
            setTranscript(res?.text || "");
          } catch (e) {
            setToast('Failed to transcribe audio.');
            setTranscript("");
          } finally {
            setLoadingVoice(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
    } catch (e: any) {
      console.error("Microphone error", e);
      setToast("Microphone access denied. Please allow microphone permissions in your browser or refresh the page.");
      setTimeout(() => setToast(''), 4000);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleVoiceSubmit = async () => {
    if (!transcript) return;
    setLoadingVoice(true);
    try {
      const res = await api.extractActions(transcript);
      setToast(res.applied.length > 0 ? `Logged: ${res.applied.join(', ')}` : 'No clear actions detected.');
      setVoiceModal(false);
      setTranscript('');
      fetchTasks();
      fetchLogs();
    } catch (e) {
      setToast('Failed to process voice log.');
    }
    setLoadingVoice(false);
    setTimeout(() => setToast(''), 4000);
  };

  const handleManualSubmit = async () => {
    if (!manualText) return;
    setLoadingManual(true);
    try {
      const res = await api.extractActions(manualText);
      setToast(res.applied.length > 0 ? `Logged: ${res.applied.join(', ')}` : 'No clear actions detected.');
      setManualModal(false);
      setManualText('');
      fetchTasks();
      fetchLogs();
    } catch (e) {
      setToast('Failed to process text.');
    }
    setLoadingManual(false);
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="p-6 relative min-h-full pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg z-50 animate-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('track')}</h1>
      <p className="text-slate-500 text-sm mb-6">{t('monitor_metrics')}</p>

      {/* Timeframe Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        {['Week', 'Month', 'All'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${timeframe === tf ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-500'}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Metric Swiper (Simple Tabs for now) */}
      <div className="flex gap-4 mb-4 text-sm font-semibold border-b border-slate-200">
        {['Activity', 'Mood', 'Sleep'].map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`pb-2 px-1 transition-colors ${metric === m ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-slate-400'}`}
          >
            {t(m.toLowerCase()) || m}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [value, metric === 'Activity' ? 'Active Calories' : metric === 'Sleep' ? 'Hours of Sleep' : 'Mood Score']}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            />
            <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={3} dot={{ r: 4, fill: lineColor, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Log */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-900">{t('quick_log')}</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <Pill icon={PillIcon} label="Meds" color="text-fuchsia-500" onClick={() => { setQuickMedModal(true); setWaterModal(false); setSleepModal(false); setWeightModal(false); setSymptomsModal(false); setVitalsModal(false); }} />
          <Pill icon={Droplet} label={t('water')} color="text-blue-500" onClick={() => { setWaterModal(!waterModal); setWaterAmount(''); setSleepModal(false); setWeightModal(false); setSymptomsModal(false); setVitalsModal(false); }} />
          <Pill icon={Moon} label={t('sleep')} color="text-indigo-500" onClick={() => { setSleepModal(!sleepModal); setSleepComment(''); setSleepHours(''); setWaterModal(false); setWeightModal(false); setSymptomsModal(false); setVitalsModal(false); }} />
          <Pill icon={Scale} label={t('weight')} color="text-emerald-600" onClick={() => { setWeightModal(!weightModal); setWeight(''); setWaterModal(false); setSleepModal(false); setSymptomsModal(false); setVitalsModal(false); }} />
          <Pill icon={Smile} label={t('mood')} color="text-amber-500" onClick={() => { openMoodModal(); setWaterModal(false); setSleepModal(false); setWeightModal(false); setSymptomsModal(false); setVitalsModal(false); }} />
          <Pill icon={Thermometer} label={t('symptoms')} color="text-rose-500" onClick={() => { setSymptomsModal(!symptomsModal); setSymptomText(''); setWaterModal(false); setSleepModal(false); setWeightModal(false); setVitalsModal(false); }} />
          <Pill icon={Heart} label={t('vitals')} color="text-red-500" onClick={() => { setVitalsModal(!vitalsModal); setBloodSugar(''); setBloodPressure(''); setHeartRate(''); setWaterModal(false); setSleepModal(false); setWeightModal(false); setSymptomsModal(false); }} />
        </div>
        
        {/* Inline Water Log */}
        {waterModal && (
           <div className="mt-2 p-4 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2 relative">
             <button onClick={() => setWaterModal(false)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600">
               <X className="w-4 h-4" />
             </button>
             <h4 className="text-sm font-bold text-blue-900 mb-2">Log Water</h4>
             <div className="flex gap-2">
               <input 
                 type="number" 
                 placeholder="Amount" 
                 className="flex-1 bg-white border border-blue-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 value={waterAmount}
                 onChange={e => setWaterAmount(e.target.value)}
               />
               <select 
                 className="bg-white border border-blue-200 rounded-lg text-sm px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 value={waterUnit}
                 onChange={e => setWaterUnit(e.target.value)}
               >
                 <option value="glasses">Glasses</option>
                 <option value="liters">Liters</option>
               </select>
               <button 
                 onClick={handleWaterSubmit}
                 className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
               >
                 Save
               </button>
             </div>
           </div>
        )}

        {/* Inline Sleep Log */}
        {sleepModal && (
           <div className="mt-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-top-2 relative">
             <button onClick={() => setSleepModal(false)} className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600">
               <X className="w-4 h-4" />
             </button>
             <h4 className="text-sm font-bold text-indigo-900 mb-2">Log Sleep</h4>
             <div className="flex gap-2">
               <input 
                 type="number" 
                 placeholder="Hours (e.g. 7.5)" 
                 className="flex-1 bg-white border border-indigo-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 value={sleepHours}
                 onChange={e => setSleepHours(e.target.value)}
               />
               <button 
                 onClick={handleSleepSubmit}
                 disabled={loadingSleep}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
               >
                 {loadingSleep ? '...' : 'Save'}
               </button>
             </div>
             {sleepComment && (
               <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-lg">
                 <div className="text-sm text-indigo-900 leading-relaxed font-medium prose prose-sm prose-indigo max-w-none">
                   <ReactMarkdown>{sleepComment}</ReactMarkdown>
                 </div>
               </div>
             )}
           </div>
        )}

        {/* Inline Weight Log */}
        {weightModal && (
           <div className="mt-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-2 relative">
             <button onClick={() => setWeightModal(false)} className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-600">
               <X className="w-4 h-4" />
             </button>
             <h4 className="text-sm font-bold text-emerald-900 mb-2">Log Weight</h4>
             <div className="flex gap-2">
               <input 
                 type="number" 
                 placeholder="Weight in kg/lbs" 
                 className="flex-1 bg-white border border-emerald-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                 value={weight}
                 onChange={e => setWeight(e.target.value)}
               />
               <button 
                 onClick={handleWeightSubmit}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
               >
                 Save
               </button>
             </div>
           </div>
        )}
        
        {symptomsModal && (
           <div className="mt-2 p-4 bg-rose-50 border border-rose-100 rounded-xl animate-in fade-in slide-in-from-top-2 relative">
             <button onClick={() => setSymptomsModal(false)} className="absolute top-2 right-2 text-rose-400 hover:text-rose-600">
               <X className="w-4 h-4" />
             </button>
             <h4 className="text-sm font-bold text-rose-900 mb-2">Log Symptoms</h4>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="e.g. Headache, fever" 
                 className="flex-1 bg-white border border-rose-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                 value={symptomText}
                 onChange={e => setSymptomText(e.target.value)}
               />
               <button 
                 onClick={handleSymptomsSubmit}
                 className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
               >
                 Save
               </button>
             </div>
           </div>
        )}

        {vitalsModal && (
           <div className="mt-2 p-4 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2 relative">
             <button onClick={() => setVitalsModal(false)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
               <X className="w-4 h-4" />
             </button>
             <h4 className="text-sm font-bold text-red-900 mb-2">Log Vitals</h4>
             <div className="flex flex-col gap-3">
               <div className="flex gap-2 items-center">
                 <input 
                   type="number" 
                   placeholder="Blood Sugar (mg/dL)" 
                   className="flex-1 bg-white border border-red-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                   value={bloodSugar}
                   onChange={e => setBloodSugar(e.target.value)}
                 />
               </div>
               <div className="flex gap-2 items-center">
                 <input 
                   type="text" 
                   placeholder="Blood Pressure (e.g. 120/80)" 
                   className="flex-1 bg-white border border-red-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                   value={bloodPressure}
                   onChange={e => setBloodPressure(e.target.value)}
                 />
                 <input 
                   type="number" 
                   placeholder="Heart Rate (bpm)" 
                   className="flex-1 bg-white border border-red-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                   value={heartRate}
                   onChange={e => setHeartRate(e.target.value)}
                 />
               </div>
               <button 
                 onClick={handleVitalsSubmit}
                 className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
               >
                 Save Vitals
               </button>
             </div>
           </div>
        )}
      </div>

      {/* Medication & Medicines Tracking Section with Reminding Everyday Option */}
      <div className="mb-8">
        <div className="bg-white rounded-3xl border border-emerald-100/90 p-5 sm:p-6 shadow-sm relative overflow-hidden text-slate-800">
          
          {/* Header Row */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Daily Prescriptions & Schedule
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PillIcon className="w-5 h-5 text-emerald-700" />
                  <span>Medication Tracking & Daily Schedule</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track prescriptions, log taken doses & manage automated everyday reminders
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMedicationModal(true)}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Medicine
                </button>
              </div>
            </div>

            {/* Everyday Reminding Option Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    remindersEnabled 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}>
                    <BellRing className={`w-5 h-5 ${remindersEnabled ? 'text-emerald-700' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Everyday Reminder Option</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        remindersEnabled 
                          ? 'bg-emerald-200/60 text-emerald-900 border border-emerald-300' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {remindersEnabled ? 'Active Everyday' : 'Muted'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Rings audio chime alarms & browser push notifications daily for your scheduled medicines.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTestEverydayReminder}
                    disabled={testingChime}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Test audio chime and browser notification"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                    {testingChime ? 'Chiming...' : 'Test Everyday Alarm'}
                  </button>

                  <button
                    onClick={() => {
                      const nextState = !remindersEnabled;
                      setRemindersEnabled(nextState);
                      if (nextState && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().catch(() => {});
                      }
                      setToast(nextState ? 'Everyday reminders enabled' : 'Everyday reminders paused');
                      setTimeout(() => setToast(''), 3000);
                    }}
                    className={`w-12 h-6 rounded-full relative transition-colors ${remindersEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    aria-label="Toggle Everyday Reminders"
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${remindersEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Medication Cards List */}
            <div className="space-y-3">
              {medications.map(med => (
                <div
                  key={med.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    med.completed
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/80 border-slate-200 hover:border-emerald-300 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleMedication(med.id)}
                        className={`mt-0.5 p-2 rounded-xl border transition-colors shrink-0 ${
                          med.completed
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-white text-slate-400 border-slate-300 hover:border-emerald-500 hover:text-emerald-700'
                        }`}
                        title={med.completed ? 'Tap to mark pending' : 'Tap to mark taken'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm sm:text-base ${med.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {med.name}
                          </span>
                          <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 font-semibold px-2.5 py-0.5 rounded-full">
                            {med.dosage}
                          </span>
                          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {med.time}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          {med.instructions || 'Take as prescribed'}
                        </p>

                        {/* Reminding Everyday badge & toggle */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <button
                            onClick={() => toggleMedRepeatDaily(med.id)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors border font-medium ${
                              med.repeatDaily
                                ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300 hover:bg-emerald-200/70'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700'
                            }`}
                            title="Toggle everyday reminder for this medicine"
                          >
                            <BellRing className={`w-3 h-3 ${med.repeatDaily ? 'text-emerald-700' : 'text-slate-400'}`} />
                            <span>{med.repeatDaily ? 'Reminding Everyday: ON' : 'Remind: Once'}</span>
                          </button>
                          {med.takenAt && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              ✓ Taken today at {med.takenAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <button
                        onClick={() => toggleMedication(med.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          med.completed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {med.completed ? '✓ Taken' : 'Mark as Taken'}
                      </button>

                      <button
                        onClick={() => deleteMedication(med.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-900">{t('today_schedule')}</h3>
          <button onClick={() => setReminderModal(true)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors">
             <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => toggleTask(task.id)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${task.completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}
            >
              <div>
                <p className={`font-semibold text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">{task.time}</p>
              </div>
              {task.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-3">Recent Logs</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-slate-800 capitalize">
                    {log.type.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      
      {/* Reminder Modal */}
      {reminderModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setReminderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">New Reminder</h3>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  className="w-full border border-emerald-400 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="e.g. Take blood pressure medication" 
                  value={reminderTitle}
                  onChange={e => setReminderTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-2.5 h-24 resize-none outline-none focus:border-emerald-500 bg-white"
                  placeholder="Any additional details..."
                  value={reminderNotes}
                  onChange={e => setReminderNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none bg-white text-slate-700 focus:border-emerald-500"
                  value={reminderCategory}
                  onChange={e => setReminderCategory(e.target.value)}
                >
                  <option value="Medication">💊 Medication</option>
                  <option value="Appointment">📅 Appointment</option>
                  <option value="Vitals">❤️ Vitals</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date & Time</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none bg-white focus:border-emerald-500 text-slate-700"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Repeat daily</p>
                  <p className="text-xs text-slate-500">Same time every day</p>
                </div>
                <button 
                  onClick={() => setReminderRepeat(!reminderRepeat)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${reminderRepeat ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${reminderRepeat ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => setReminderModal(false)}
                className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReminderSubmit}
                disabled={loadingReminder || !(reminderTitle || '').trim() || !reminderTime}
                className="flex-1 bg-[#6FB4A0] hover:bg-[#5C9E8A] text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingReminder ? 'Saving...' : 'Create Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mood / Camera Modal */}
      {moodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md h-[85vh] max-h-[660px] flex flex-col relative shadow-2xl border border-slate-100">
            <button onClick={closeMoodModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-20 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between mb-3 pr-8">
              <h3 className="text-xl font-bold text-slate-900">Biometric Face Scan</h3>
              <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded uppercase font-semibold ${
                capturedFaceImage ? (loadingMood ? 'bg-cyan-100 text-cyan-800 animate-pulse' : 'bg-emerald-100 text-emerald-800') : 'bg-slate-100 text-slate-700'
              }`}>
                {capturedFaceImage ? (loadingMood ? 'ANALYZING...' : 'FROZEN SNAPSHOT') : 'LIVE VIEWFINDER'}
              </span>
            </div>
            
            <div className="relative bg-slate-950 rounded-xl overflow-hidden flex-1 w-full mx-auto mb-4 flex items-center justify-center border border-slate-800 shadow-inner">
              {/* Live Video (Hidden immediately when photo is captured) */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${capturedFaceImage ? 'hidden' : 'block'}`} 
              />

              {/* Frozen Snapshot (Camera Freeze) */}
              {capturedFaceImage && (
                <img 
                  src={capturedFaceImage} 
                  alt="Captured face snapshot" 
                  className="w-full h-full object-cover" 
                />
              )}

              {/* Camera Shutter Flash */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 pointer-events-none" />
              )}

              {/* Viewfinder & Biometric HUD Overlays */}
              {!moodResult && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                  <div className="flex justify-between items-start">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" />
                  </div>
                  
                  {/* Laser scanline sweeping down the frozen frame while analyzing */}
                  {loadingMood && (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                      <div className="mt-3 bg-slate-900/90 backdrop-blur-md border border-cyan-400/60 text-cyan-300 text-xs font-mono px-3.5 py-1.5 rounded-full shadow-xl flex items-center gap-2">
                        <Scan className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>PROCESSING BIOMETRICS...</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-end">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" />
                  </div>
                </div>
              )}

              {/* Analysis Result Display */}
              {moodResult && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-5 overflow-y-auto z-20 flex flex-col animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Smile className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Biometric Assessment</h4>
                      <p className="text-xs text-slate-500">Visual mood & vitality indicators</p>
                    </div>
                  </div>
                  <div className="text-slate-800 text-sm leading-relaxed prose prose-sm prose-slate max-w-none flex-1">
                    <ReactMarkdown>{moodResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            {!capturedFaceImage && (
              <button 
                onClick={captureFace}
                disabled={loadingMood}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Camera className="w-5 h-5 text-cyan-400" />
                <span>Snap Photo & Analyze</span>
              </button>
            )}

            {capturedFaceImage && !moodResult && (
              <div className="flex gap-2">
                <button 
                  onClick={retakeFace}
                  disabled={loadingMood}
                  className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  Retake
                </button>
                <div className="flex-[2] bg-slate-100 text-slate-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm border border-slate-200">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  Analyzing biomarkers...
                </div>
              </div>
            )}

            {moodResult && (
              <div className="flex gap-2">
                <button 
                  onClick={retakeFace}
                  className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  Scan Again
                </button>
                <button 
                  onClick={closeMoodModal}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Modal */}
      {manualModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setManualModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Manual Log</h3>
            <textarea
              placeholder="e.g., I walked for 30 minutes and drank 2 glasses of water"
              className="w-full border-slate-200 rounded-xl mb-4 p-3 h-32 resize-none outline-none focus:ring-2 focus:ring-emerald-500"
              value={manualText}
              onChange={e => setManualText(e.target.value)}
            />
            <button
              onClick={handleManualSubmit}
              disabled={loadingManual || !(manualText || '').trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingManual ? 'Saving...' : 'Log Activity'}
            </button>
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {voiceModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative text-center">
            <button onClick={() => { setVoiceModal(false); stopRecording(); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Voice Log</h3>
            
            <div className="flex justify-center mb-6">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-6 rounded-full transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
              >
                <Mic className="w-12 h-12" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {isRecording ? "Listening... click to stop" : "Tap the microphone and speak"}
            </p>
            {transcript && (
              <div className="bg-slate-50 p-4 rounded-xl mb-4 text-left">
                <p className="text-sm text-slate-700 italic">"{transcript}"</p>
              </div>
            )}
            <button
              onClick={handleVoiceSubmit}
              disabled={loadingVoice || !(transcript || '').trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingVoice ? 'Processing...' : 'Save Voice Log'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Med Modal (opened from Quick Log pill) */}
      {quickMedModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative text-slate-800 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setQuickMedModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <PillIcon className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-bold text-slate-900">Quick Medication Log</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select which medicine you took to record it immediately in your logs & Caretaker Pulse digest.
            </p>

            <div className="space-y-2 mb-4 flex-1 overflow-y-auto pr-1">
              {medications.map(med => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => {
                    toggleMedication(med.id);
                    setQuickMedModal(false);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left transition-all shadow-xs"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-900">{med.name} ({med.dosage})</p>
                    <p className="text-xs text-slate-500 mt-0.5">Scheduled: {med.time} • Everyday: {med.repeatDaily ? 'Yes' : 'No'}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${med.completed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-700 text-white shadow-xs'}`}>
                    {med.completed ? '✓ Taken' : 'Take Now'}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setQuickMedModal(false);
                  setMedicationModal(true);
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
              >
                + Add New Prescription
              </button>
              <button
                type="button"
                onClick={() => setQuickMedModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {medicationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg relative text-slate-800 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setMedicationModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1 shrink-0">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <PillIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add Prescription / Medicine</h3>
                <p className="text-xs text-slate-500">
                  Set up daily dosages and automated everyday reminders.
                </p>
              </div>
            </div>

            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto pr-1 mt-3 space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Quick Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Metformin', dosage: '500mg', time: '08:00 AM' },
                    { name: 'Lisinopril', dosage: '10mg', time: '01:00 PM' },
                    { name: 'Atorvastatin', dosage: '20mg', time: '08:00 PM' },
                    { name: 'Aspirin', dosage: '81mg', time: '09:00 AM' },
                    { name: 'Multivitamin', dosage: '1 tablet', time: '08:30 AM' }
                  ].map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setNewMedName(p.name);
                        setNewMedDosage(p.dosage);
                        setNewMedTime(p.time);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs text-emerald-800 font-medium transition-colors"
                    >
                      + {p.name} ({p.dosage})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  placeholder="e.g. Metformin, Amlodipine"
                  value={newMedName}
                  onChange={e => setNewMedName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    placeholder="e.g. 500mg, 1 tablet"
                    value={newMedDosage}
                    onChange={e => setNewMedDosage(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                    placeholder="e.g. 08:00 AM"
                    value={newMedTime}
                    onChange={e => setNewMedTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Notes (Optional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                  placeholder="e.g. Take with breakfast and water"
                  value={newMedInstructions}
                  onChange={e => setNewMedInstructions(e.target.value)}
                />
              </div>

              {/* Remind Me Everyday Option */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">Remind Me Everyday</p>
                    <p className="text-[11px] text-slate-500">Receive daily recurring notifications & alarms</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewMedRepeatDaily(!newMedRepeatDaily)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${newMedRepeatDaily ? 'bg-emerald-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${newMedRepeatDaily ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Prominently visible footer action buttons */}
            <div className="flex items-center gap-3 pt-4 mt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setMedicationModal(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMedication}
                disabled={!(newMedName || '').trim()}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shadow-md active:scale-[0.99]"
              >
                Save Medication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable FAB */}
      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-3 z-40">
        {fabOpen && (
          <>
            <button onClick={() => { setManualModal(true); setFabOpen(false); }} className="bg-white text-emerald-800 p-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 pr-4 transition-transform animate-in slide-in-from-bottom-4">
              <Edit3 className="w-5 h-5" />
              <span className="text-sm font-bold">Manual Text</span>
            </button>
            <button onClick={() => { setVoiceModal(true); setFabOpen(false); }} className="bg-white text-emerald-800 p-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 pr-4 transition-transform animate-in slide-in-from-bottom-8">
              <Mic className="w-5 h-5" />
              <span className="text-sm font-bold">Voice Log</span>
            </button>
          </>
        )}
        <button 
          onClick={() => setFabOpen(!fabOpen)}
          className={`bg-emerald-800 hover:bg-emerald-900 text-white p-4 rounded-full shadow-lg transition-transform ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm shrink-0 hover:bg-slate-50 transition-colors">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </button>
  );
}
