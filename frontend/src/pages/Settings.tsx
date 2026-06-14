import { useState } from 'react';
import { Settings as SettingsIcon, Server, ToggleLeft, ToggleRight, Save, RotateCcw } from 'lucide-react';
import { getApiUrl, setApiUrl, getUseMock, setUseMock } from '../api';

export default function Settings() {
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [useMock, setUseMockState] = useState(getUseMock());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiUrl(apiUrl.trim());
    setUseMock(useMock);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setApiUrlState(getApiUrl());
    setUseMockState(getUseMock());
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure backend connection and preferences.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Server className="w-4 h-4" /> Backend Connection
        </h2>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">API Base URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-400">The base URL of the ScribeAI backend API.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">Use Mock Data</div>
              <p className="text-xs text-slate-400">Simulate backend responses for testing.</p>
            </div>
            <button
              onClick={() => setUseMockState((v) => !v)}
              className="text-slate-600 hover:text-slate-900"
            >
              {useMock ? <ToggleRight className="w-8 h-8 text-teal-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">Saved successfully</span>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="w-4 h-4" /> About
        </h2>
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>ScribeAI</strong> — AI-powered clinical documentation assistant.</p>
          <p>Version 0.1.0</p>
          <p className="text-slate-400 text-xs mt-2">
            This application is intended for demonstration and testing purposes.
            Do not use with real Protected Health Information (PHI) without proper HIPAA safeguards.
          </p>
        </div>
      </div>
    </div>
  );
}
