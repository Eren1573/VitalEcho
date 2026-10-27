export interface User {
  userId: string;
  name: string;
  age: number;
  gender: string;
  concerns: string[];
  weight?: string;
}

export interface Log {
  id: number;
  userId: string;
  type: string;
  value?: string;
  heartRate?: number;
  data?: any;
  timestamp: string;
}

export interface ScheduleItem {
  id: string | number;
  userId: string;
  title: string;
  time: string;
  completed: boolean;
  notes?: string;
  category?: string;
  repeatDaily?: boolean;
}

export interface AnomalyAlert {
  id: string;
  severity: 'alert' | 'warning' | 'stable';
  type: 'water_drop' | 'hr_creep' | 'medication_adherence' | 'general';
  title: string;
  headline: string;
  metric: string;
  delta: string;
  description: string;
  clinicalRisk: string;
  recommendedAction: string;
}

export interface CaretakerDigest {
  executiveSummary: string;
  spokenText: string;
  statusLevel: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL_ALERT';
  wellnessScore: number;
  telemetry: {
    activity: string;
    medications: string;
    hydration: string;
    vitals: string;
    mood: string;
  };
  anomalies: AnomalyAlert[];
}

export interface MedicalReport {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  reportType: 'lab_result' | 'prescription' | 'radiology' | 'discharge' | 'general';
  date: string;
  summary: string;
  careInstructions: string[];
  medications: string[];
  criticalFlags?: string[];
  fileName?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt?: string;
}


