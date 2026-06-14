import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, RotateCcw, ChevronLeft, Edit3, Save, AlertCircle,
  Stethoscope, ClipboardList, Activity, Pill, Tag,
} from 'lucide-react';
import { api, type Session, type SOAPNote } from '../api';

export default function NoteReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('id');

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedNote, setEditedNote] = useState<SOAPNote | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSessions().then((sessions) => {
      const found = sessions.find((s) => s.id === sessionId);
      if (found) {
        setSession(found);
        setEditedNote(found.soapNote || null);
      } else {
        setError('Session not found.');
      }
      setLoading(false);
    }).catch(() => {
      setError('Failed to load session.');
      setLoading(false);
    });
  }, [sessionId]);

  const handleSave = async () => {
    if (!session || !editedNote) return;
    try {
      const updated = await api.updateSession(session.id, {
        soapNote: editedNote,
        status: 'Reviewed',
      });
      setSession(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save changes.');
    }
  };

  const handleAccept = async () => {
    if (!session) return;
    try {
      const updated = await api.updateSession(session.id, { status: 'Reviewed' });
      setSession(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">Loading session...</div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error || 'Session not found.'}
        </div>
      </div>
    );
  }

  const note = editing ? editedNote : session.soapNote;

  const sections: { key: keyof SOAPNote; label: string; icon: typeof FileText }[] = [
    { key: 'subjective', label: 'Subjective', icon: ClipboardList },
    { key: 'objective', label: 'Objective', icon: Activity },
    { key: 'assessment', label: 'Assessment', icon: Stethoscope },
    { key: 'plan', label: 'Plan', icon: Pill },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Note Review</h1>
          <p className="text-slate-500 mt-1">{session.patientName} • {session.date}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {session.status !== 'Reviewed' && (
            <>
              {editing ? (
                <button onClick={handleSave} className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <Save className="w-4 h-4" /> Save
                </button>
              ) : (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
              )}
              {!editing && (
                <button onClick={handleAccept} className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Accept
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      {session.transcript && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4" /> Transcript</h2>
          <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-100 max-h-64 overflow-auto">
            {session.transcript}
          </div>
        </div>
      )}

      {/* SOAP Note */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> SOAP Note</h2>
        {note ? (
          <div className="space-y-5">
            {sections.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Icon className="w-4 h-4 text-teal-600" /> {label}
                </div>
                {editing ? (
                  <textarea
                    value={(note[key] as string) || ''}
                    onChange={(e) => setEditedNote((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-100">
                    {note[key] as string}
                  </div>
                )}
              </div>
            ))}

            {note.icdCodes && note.icdCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Tag className="w-4 h-4 text-teal-600" /> ICD-10 Codes
                </div>
                <div className="flex flex-wrap gap-2">
                  {note.icdCodes.map((code) => (
                    <span key={code.code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {code.code} <span className="text-slate-400">—</span> {code.description}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No SOAP note generated yet.</div>
        )}
      </div>

      {editing && (
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <button onClick={() => { setEditing(false); setEditedNote(session.soapNote || null); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
            <RotateCcw className="w-4 h-4" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
