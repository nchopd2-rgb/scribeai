import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Mic,
  FileCheck,
  Clock,
  ChevronRight,
  Calendar,
  User,
} from 'lucide-react';
import { api, type Session } from '../api';

const statusConfig: Record<
  Session['status'],
  { label: string; className: string; icon: typeof Clock }
> = {
  Recording: {
    label: 'Recording',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Mic,
  },
  Transcribing: {
    label: 'Transcribing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
  },
  Ready: {
    label: 'Ready for Review',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: FileCheck,
  },
  Reviewed: {
    label: 'Reviewed',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: FileCheck,
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = sessions.filter((s) =>
    s.patientName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: sessions.length,
    ready: sessions.filter((s) => s.status === 'Ready').length,
    reviewed: sessions.filter((s) => s.status === 'Reviewed').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Manage your patient encounters and AI-generated notes.
          </p>
        </div>
        <button
          onClick={() => navigate('/record')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm text-slate-500">Total Encounters</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm text-slate-500">Ready for Review</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {stats.ready}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm text-slate-500">Reviewed</div>
          <div className="text-3xl font-bold text-slate-700 mt-1">
            {stats.reviewed}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Sessions list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Encounters</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            Loading encounters...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No encounters found.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((session) => {
              const status = statusConfig[session.status];
              const StatusIcon = status.icon;
              return (
                <li
                  key={session.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/review?id=${session.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {session.patientName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {session.date}
                          </span>
                          <span>•</span>
                          <span>{session.patientGender}</span>
                          <span>•</span>
                          <span>DOB: {session.patientDob}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
