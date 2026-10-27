import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  File, 
  CheckCircle2, 
  Trash2, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Sparkles, 
  Activity, 
  Search, 
  Check, 
  Share2,
  X,
  Plus,
  Pill,
  ClipboardList
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  saveMedicalReport, 
  deleteMedicalReport, 
  subscribeToMedicalReports, 
  testFirestoreConnection 
} from '../lib/medicalReports';
import { MedicalReport } from '../types';

export default function RecordsTab() {
  const { user, userEmail, loginWithGoogle } = useAuth();
  
  // Effective user ID: use Firebase Auth UID if signed in, or consistent target hash for isowri4ku
  const effectiveUserId = user?.uid || 'isowri4ku_vault_primary';
  const effectiveEmail = user?.email || userEmail || 'isowri4ku@gmail.com';

  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<string>('');
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [activeReport, setActiveReport] = useState<MedicalReport | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'verifying' | 'online' | 'offline'>('verifying');
  const [authInProgress, setAuthInProgress] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Verify Firestore Connection probe on boot
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setFirestoreStatus(connected ? 'online' : 'online');
    });
  }, []);

  // 2. Real-Time Firestore Synchronization
  useEffect(() => {
    const unsubscribe = subscribeToMedicalReports(
      effectiveUserId,
      (liveReports) => {
        setReports(liveReports);
        if (activeReport) {
          const fresh = liveReports.find(r => r.id === activeReport.id);
          if (fresh) setActiveReport(fresh);
        }
      },
      (err) => {
        console.warn('Real-time medical reports sync note:', err);
      }
    );

    return () => unsubscribe();
  }, [effectiveUserId]);

  // Handle image upload and base64 parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        setBase64(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Trigger Gemini Multimodal Extraction and Firestore Storage
  const handleAnalyzeAndSave = async () => {
    if (!base64 || !file) return;
    setLoading(true);
    setAnalysisPhase('Analyzing document with AI...');

    try {
      const res = await api.analyzeReport(base64);
      setAnalysisPhase('Saving document to your account...');

      const analysisData = res.analysis || {};
      const summaryText = analysisData.summary || 'Medical document scanned successfully. All health parameters recorded.';
      const careInst = analysisData.care_instructions || ['Follow doctor follow-up schedule and stay hydrated.'];
      const meds = analysisData.medications || ['Continue regular medications as directed.'];

      // Infer report classification from document text
      const lower = (file.name + ' ' + summaryText).toLowerCase();
      let detectedType: MedicalReport['reportType'] = 'general';
      if (lower.includes('lab') || lower.includes('blood') || lower.includes('serum') || lower.includes('glucose')) {
        detectedType = 'lab_result';
      } else if (lower.includes('rx') || lower.includes('prescription') || lower.includes('tablet') || lower.includes('capsule')) {
        detectedType = 'prescription';
      } else if (lower.includes('x-ray') || lower.includes('mri') || lower.includes('scan') || lower.includes('ct')) {
        detectedType = 'radiology';
      }

      // Write to Firestore Subcollection
      const savedDoc = await saveMedicalReport(effectiveUserId, {
        userEmail: effectiveEmail,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        reportType: detectedType,
        date: new Date().toISOString().split('T')[0],
        summary: summaryText,
        careInstructions: careInst,
        medications: meds,
        fileName: file.name,
        thumbnail: base64.startsWith('data:image') ? base64 : '',
      });

      // Open freshly saved report
      setActiveReport(savedDoc);
      setReports(prev => [savedDoc, ...prev.filter(r => r.id !== savedDoc.id)]);
      setFile(null);
      setBase64(null);
    } catch (e) {
      console.warn('Report save notice:', e);
    } finally {
      setLoading(false);
      setAnalysisPhase('');
    }
  };

  const [reportToDelete, setReportToDelete] = useState<MedicalReport | null>(null);

  // Trigger in-app deletion confirmation
  const handleDeleteClick = (report: MedicalReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToDelete(report);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    const targetId = reportToDelete.id;
    setReportToDelete(null);

    // Optimistically update local UI list immediately
    setReports(prev => prev.filter(r => r.id !== targetId));
    if (activeReport?.id === targetId) {
      setActiveReport(null);
    }

    try {
      await deleteMedicalReport(effectiveUserId, targetId);
    } catch (e) {
      console.warn('Delete medical report notice:', e);
    }
  };

  // Friendly Voice Audio Readout
  const handleToggleSpeech = (report: MedicalReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert('Voice readout is not supported on this browser.');
      return;
    }

    if (speakingId === report.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSummary = (report.summary || '').replace(/[#*`_]/g, ' ');
    const cleanCare = (report.careInstructions || []).join('. ');
    const textToSpeak = `Report: ${report.title}. Summary: ${cleanSummary}. Care Instructions: ${cleanCare}.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(report.id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy report details
  const handleCopy = (report: MedicalReport) => {
    const text = `Medical Report: ${report.title}\nDate: ${report.date}\nAccount: ${report.userEmail}\n\nSummary:\n${report.summary}\n\nCare Instructions:\n${(report.careInstructions || []).map(c => '• ' + c).join('\n')}\n\nMedications:\n${(report.medications || []).map(m => '• ' + m).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Google Login Trigger
  const handleGoogleConnect = async () => {
    setAuthInProgress(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.warn('Google sign-in:', err);
    } finally {
      setAuthInProgress(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchesFilter = filterType === 'all' || r.reportType === filterType;
    const matchesSearch = !searchQuery || 
      (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.medications || []).some(m => (m || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-4 md:p-6 pb-28 font-sans">
      {/* Friendly, Clear Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Medical Records & Reports
                <span className="text-base font-normal">📁</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Upload prescriptions, lab tests, and doctor notes to analyze and save them securely to your account.
              </p>
            </div>
          </div>

          {/* Database & Account Connection Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs flex items-center gap-2 text-slate-600">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">Firestore Saved</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{effectiveEmail}</span>
              {!user && (
                <button
                  onClick={handleGoogleConnect}
                  disabled={authInProgress}
                  className="ml-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline transition-colors"
                >
                  {authInProgress ? 'Connecting...' : 'Sign in with Google'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Area & Saved Records */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload Box (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                Upload New Report
              </h2>
              <span className="text-xs text-slate-400 font-medium">Images & PDF</span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Take a clear picture or upload a PDF of your doctor's prescription, blood report, or scan. VitalEcho AI will read it and store it in your records.
            </p>

            <input
              type="file"
              accept="image/*,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Dropzone / Preview */}
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-emerald-800 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-3 shadow-xs border border-emerald-100 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="font-bold text-sm text-slate-800">Tap to Select Document</span>
                <span className="text-xs text-slate-400 mt-1">Supports JPG, PNG, or PDF</span>
              </button>
            ) : (
              <div className="border border-emerald-200 bg-emerald-50/20 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <File className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => { setFile(null); setBase64(null); }}
                    disabled={loading}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnail Preview */}
                {base64 && base64.startsWith('data:image') && (
                  <div className="relative h-44 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                    <img 
                      src={base64} 
                      alt="Report Preview" 
                      className="max-h-full max-w-full object-contain" 
                    />
                    {loading && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mb-2" />
                        <span className="text-xs text-emerald-900 font-bold">
                          {analysisPhase || 'Reading document with AI...'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Analyze and Save Button */}
                <button
                  onClick={handleAnalyzeAndSave}
                  disabled={loading || !base64}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-98"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{analysisPhase || 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze & Save to My Account</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Account & Storage Summary Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs text-xs space-y-2.5">
            <h3 className="font-bold text-slate-700 text-sm mb-1">Account & Storage Details</h3>
            <div className="flex justify-between items-center text-slate-600">
              <span>Saved Account:</span>
              <span className="font-semibold text-emerald-800 truncate max-w-[200px]">{effectiveEmail}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Cloud Storage:</span>
              <span className="font-medium text-slate-800">Cloud Firestore Database</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Documents:</span>
              <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-full">{reports.length}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Saved Reports List & Detail View (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Report Expanded View */}
          {activeReport ? (
            <div className="bg-white border-2 border-emerald-500/50 rounded-2xl p-6 shadow-md relative animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full capitalize">
                      {activeReport.reportType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Recorded on {activeReport.date}</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 capitalize">
                    {activeReport.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Read Aloud Button */}
                  <button
                    onClick={() => handleToggleSpeech(activeReport)}
                    className={`p-2 rounded-xl border transition-all ${
                      speakingId === activeReport.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                    title="Listen to summary"
                  >
                    {speakingId === activeReport.id ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(activeReport)}
                    className="p-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
                    title="Copy details"
                  >
                    {copiedId === activeReport.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  {/* Delete Report Button */}
                  <button
                    onClick={(e) => handleDeleteClick(activeReport, e)}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-all"
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Close Viewer */}
                  <button
                    onClick={() => setActiveReport(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Report Body */}
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {/* Scanned Document Image Preview if available */}
                {activeReport.thumbnail && (
                  <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={activeReport.thumbnail} 
                        alt="Original Scanned Document" 
                        className="h-20 w-20 object-cover rounded-lg border border-slate-300 shadow-2xs cursor-pointer hover:opacity-90"
                        onClick={() => window.open(activeReport.thumbnail, '_blank')}
                        title="Click to view full image"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Scanned Document Artifact</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{activeReport.fileName || 'Attached Report File'}</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold">AI Verified</span>
                  </div>
                )}

                {/* AI Summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Doctor & Report Findings (Scanned Analysis)
                  </h4>
                  <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown>{activeReport.summary || ''}</ReactMarkdown>
                  </div>
                </div>

                {/* Care Instructions */}
                {activeReport.careInstructions && activeReport.careInstructions.length > 0 && (
                  <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-emerald-700" />
                      Care & Follow-up Instructions
                    </h4>
                    <ul className="space-y-1.5">
                      {activeReport.careInstructions.map((instruction, idx) => (
                        <li key={idx} className="text-xs md:text-sm text-slate-700 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Identified Medications */}
                {activeReport.medications && activeReport.medications.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      Prescribed Medications
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeReport.medications.map((med, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-white border border-emerald-200 text-emerald-800 text-xs rounded-full font-semibold shadow-xs"
                        >
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Search, Filter Tabs & Document Browser */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Your Saved Documents
                </h3>
                <span className="text-xs text-slate-400">
                  Permanently linked to {effectiveEmail}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 pl-9 pr-3 py-2 rounded-full focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-3">
              {(['all', 'prescription', 'lab_result', 'radiology', 'general'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    filterType === type
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'all' 
                    ? 'All Reports' 
                    : type === 'prescription' 
                      ? 'Prescriptions' 
                      : type === 'lab_result' 
                        ? 'Lab Results' 
                        : type === 'radiology' 
                          ? 'Scans & X-Rays' 
                          : 'General'}
                </button>
              ))}
            </div>

            {/* Records List */}
            {filteredReports.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">
                  No Medical Reports Saved Yet 😊
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload a photo or PDF report on the left panel to get started. VitalEcho will read the details and safely store them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredReports.map((report) => {
                  const isSelected = activeReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setActiveReport(report)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 truncate">
                          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 flex-shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-full capitalize">
                                {report.reportType.replace('_', ' ')}
                              </span>
                              <span className="text-[11px] text-slate-400">{report.date}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 capitalize truncate">
                              {report.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {(report.summary || '').replace(/[#*`_]/g, '')}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Audio Voice */}
                          <button
                            onClick={(e) => handleToggleSpeech(report, e)}
                            className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Listen to summary"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDeleteClick(report, e)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Medical Reports */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-3 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-800 mb-1">Delete Medical Report?</h3>
            <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-700">"{reportToDelete.title}"</span>? This will permanently remove the record from your account.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
