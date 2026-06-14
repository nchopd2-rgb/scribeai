import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, Square, Upload, Loader2, CheckCircle2, AlertCircle, User, ChevronRight,
} from 'lucide-react';
import { api, type Session } from '../api';

type RecordingState = 'idle' | 'recording' | 'stopped';

export default function Record() {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [step, setStep] = useState<'info' | 'capture' | 'processing' | 'done'>('info');
  const [session, setSession] = useState<Session | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState('stopped');
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCreateSession = async () => {
    if (!patientName.trim() || !patientDob || !patientGender) {
      setError('Please fill in all patient fields.');
      return;
    }
    setError('');
    try {
      const s = await api.createSession({ patientName: patientName.trim(), patientDob, patientGender });
      setSession(s);
      setStep('capture');
    } catch {
      setError('Failed to create session.');
    }
  };

  const handleUpload = async () => {
    if (!session) return;
    const file = uploadFile || audioBlob;
    if (!file) { setError('Please record or select an audio file.'); return; }
    setError('');
    setProcessing(true);
    setStep('processing');
    try {
      const updated = await api.uploadAudio(session.id, file as File);
      setSession(updated);
      setStep('done');
    } catch {
      setError('Upload or transcription failed. Please try again.');
      setProcessing(false);
      setStep('capture');
    }
  };

  const reset = () => {
    setPatientName(''); setPatientDob(''); setPatientGender('');
    setStep('info'); setSession(null); setAudioBlob(null); setUploadFile(null);
    setRecordingState('idle'); setRecordingTime(0); setError(''); setProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Session</h1>
        <p className="text-slate-500 mt-1">Start a patient encounter, record audio, and generate notes.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {step === 'info' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><User className="w-4 h-4" /> Patient Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Jane Doe" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select...</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button onClick={handleCreateSession} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'capture' && session && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Patient</div>
              <div className="font-semibold text-slate-800">{session.patientName}</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Recording</span>
          </div>

          <div className="flex flex-col items-center gap-4 py-6">
            {recordingState === 'idle' && (
              <button onClick={startRecording} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                <Mic className="w-8 h-8" />
              </button>
            )}
            {recordingState === 'recording' && (
              <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                <Square className="w-8 h-8" />
              </button>
            )}
            {recordingState === 'stopped' && (
              <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}
            <div className="text-2xl font-mono font-semibold text-slate-700">{formatTime(recordingTime)}</div>
            <div className="text-sm text-slate-500">
              {recordingState === 'idle' && 'Click to start recording'}
              {recordingState === 'recording' && 'Recording... click to stop'}
              {recordingState === 'stopped' && 'Recording saved'}
            </div>
          </div>

          <div className="relative border-t border-slate-100 pt-6">
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-xs text-slate-400">or</div>
            <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors">
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-sm text-slate-600">{uploadFile ? uploadFile.name : 'Click to upload audio file'}</span>
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <button onClick={handleUpload} disabled={(!audioBlob && !uploadFile) || processing} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {processing ? 'Uploading & Transcribing...' : 'Upload & Transcribe'}
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="text-lg font-semibold text-slate-800">Transcribing & Generating Notes</div>
          <div className="text-sm text-slate-500">This may take a few moments...</div>
        </div>
      )}

      {step === 'done' && session && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Notes Ready</div>
              <div className="text-sm text-slate-500">Transcription and SOAP note generated.</div>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => navigate(`/review?id=${session.id}`)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Review Notes <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={reset} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
              Start Another Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
