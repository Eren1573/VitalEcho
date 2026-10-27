import React, { useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import VitalEchoLogo from './VitalEchoLogo';

export default function Onboarding({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    concerns: [] as string[]
  });
  const navigate = useNavigate();

  const handleToggleConcern = (concern: string) => {
    if (concern === 'NONE') {
      setFormData(prev => ({
        ...prev,
        concerns: prev.concerns.includes('NONE') ? [] : ['NONE']
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns.filter(c => c !== 'NONE'), concern]
    }));
  };

  const handleNext = () => setStep(step + 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.onboard({
        name: formData.name || 'User',
        age: parseInt(formData.age) || 30,
        gender: formData.gender,
        concerns: formData.concerns
      });
      onLogin();
      navigate('/app');
    } catch (e) {
      console.error(e);
      alert('Onboarding failed');
    }
    setLoading(false);
  };

  const CONCERNS_LIST = [
    'PCOS', 'Infertility', 'Early Puberty', 'Breast Cancer', 'Cancer',
    'Thyroid Issues', 'Iron Deficiency', 'Blood Pressure', 'Blood Sugar',
    'Heart Health', 'Sleep Quality', 'Stress & Anxiety', 'Weight Management',
    'NONE'
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#F8FAFC] items-center justify-center p-4 font-sans">
      <div className="mb-8 text-center flex flex-col items-center">
        <VitalEchoLogo className="w-16 h-16 mb-3 drop-shadow-sm" />
        <h1 className="text-4xl font-bold tracking-tight text-slate-800 mb-2">VitalEcho</h1>
        <p className="text-slate-500 font-medium">Your everyday health companion.</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 text-center mb-6">Let's get to know you</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-emerald-600"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Age</label>
                  <input 
                    type="number" 
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-emerald-600"
                    placeholder="e.g. 35"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-emerald-600"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={!formData.name || !formData.age || !formData.gender}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 text-center mb-6">Any health concerns?</h2>
                <p className="text-sm text-slate-500 text-center mb-4">Select all that apply to personalize your experience.</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {CONCERNS_LIST.map(c => (
                    <button
                      key={c}
                      onClick={() => handleToggleConcern(c)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${formData.concerns.includes(c) ? 'bg-emerald-100 border-emerald-600 text-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Starting...' : 'Complete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
