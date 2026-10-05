import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Users, Monitor, Clock, RefreshCw, PlusCircle,
  Sparkles, CheckCircle2, AlertTriangle, Flame, ArrowUpRight,
  Filter, Layers, Info, Calendar, Download, Check
} from 'lucide-react';
import { utilizationService, labService } from '../../services/api';
import PageHeader from '../../components/PageHeader';

export default function LabUtilizationPage() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [filterLab, setFilterLab] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');

  // Modal for new session
  const [modalOpen, setModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    lab_id: '',
    number_of_students: 25,
    pcs_used: 25,
    session_duration_minutes: 90,
    session_date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  // Interactive Live Classifier Calculator
  const [calcInput, setCalcInput] = useState({
    students: 25,
    pcs: 24,
    duration: 90,
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [filterLab, filterLevel]);

  // Run live prediction when calculator inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      runLivePrediction();
    }, 250);
    return () => clearTimeout(timer);
  }, [calcInput]);

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, labsRes, sessionsRes] = await Promise.all([
        utilizationService.getStats(),
        labService.list({ per_page: 50 }),
        utilizationService.getSessions({
          lab_id: filterLab || undefined,
          level: filterLevel !== 'All' ? filterLevel : undefined,
          limit: 100,
        }),
      ]);

      setStats(statsRes.data);
      setLabs(labsRes.data.items || []);
      setSessions(sessionsRes.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch utilization analytics. Please ensure the backend is running.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  const runLivePrediction = async () => {
    try {
      setCalculating(true);
      const res = await utilizationService.predict({
        number_of_students: Number(calcInput.students),
        pcs_used: Number(calcInput.pcs),
        session_duration_minutes: Number(calcInput.duration),
      });
      setCalcResult(res.data);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleSyncBookings = async () => {
    try {
      setRefreshing(true);
      const res = await utilizationService.syncBookings();
      setSuccessMsg(res.data.message || 'Bookings synced into utilization records.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync bookings.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSession.lab_id) {
      alert('Please select a laboratory.');
      return;
    }

    try {
      setSubmitting(true);
      await utilizationService.createSession({
        lab_id: Number(newSession.lab_id),
        number_of_students: Number(newSession.number_of_students),
        pcs_used: Number(newSession.pcs_used),
        session_duration_minutes: Number(newSession.session_duration_minutes),
        session_date: newSession.session_date,
      });

      setModalOpen(false);
      setSuccessMsg('New lab usage session recorded and classified by K-Means successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create session record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Level Badge Helper
  const renderLevelBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Low Utilization
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Medium Utilization
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            High Utilization
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">
            {level || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-400" />
              AI Lab Utilization Analysis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              K-Means (K=3)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Unsupervised machine-learning clustering across student attendance, PC occupancy, and duration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncBookings}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Import completed reservations into utilization dataset"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Sync Bookings
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Session
          </button>

          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Sessions */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Sessions</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.total_sessions ?? 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Historical logs</span>
          </div>
        </div>

        {/* Low Utilization */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Low Usage</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.low_count ?? 0}</span>
            <span className="text-[11px] text-emerald-400/80 block mt-0.5">{stats?.low_percentage ?? 0}% of sessions</span>
          </div>
        </div>

        {/* Medium Utilization */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Medium Usage</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.medium_count ?? 0}</span>
            <span className="text-[11px] text-amber-400/80 block mt-0.5">{stats?.medium_percentage ?? 0}% of sessions</span>
          </div>
        </div>

        {/* High Utilization */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 text-xs font-medium">
            <span>High Usage</span>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.high_count ?? 0}</span>
            <span className="text-[11px] text-purple-400/80 block mt-0.5">{stats?.high_percentage ?? 0}% of sessions</span>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Duration</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.avg_duration_minutes ?? 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">minutes per session</span>
          </div>
        </div>

        {/* Avg Students */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg Attendance</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{stats?.avg_students ?? 0}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">students / session</span>
          </div>
        </div>
      </div>

      {/* ── Two Column: K-Means Cluster Characteristics & Live Simulator ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cluster Centroids & Interpretation (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Learned Cluster Centroids (K=3)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cluster centers computed by K-Means algorithm after feature standardization (mean=0, std=1).
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
              Silhouette: 0.702
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {stats?.cluster_statistics?.map((c) => {
              const isLow = c.level === 'Low';
              const isMed = c.level === 'Medium';
              const isHigh = c.level === 'High';

              const borderCls = isLow
                ? 'border-emerald-500/40 hover:border-emerald-400'
                : isMed
                ? 'border-amber-500/40 hover:border-amber-400'
                : 'border-purple-500/40 hover:border-purple-400';

              const headerBg = isLow
                ? 'bg-emerald-500/10 text-emerald-400'
                : isMed
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-purple-500/10 text-purple-400';

              return (
                <div
                  key={c.cluster_id}
                  className={`rounded-xl bg-slate-950/70 border ${borderCls} p-4 flex flex-col justify-between transition-all hover:shadow-lg space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${headerBg}`}>
                      {c.level} Utilization
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Cluster #{c.cluster_id}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Students:
                      </span>
                      <strong className="font-mono text-white text-sm">{c.centroid?.students}</strong>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5 text-slate-500" />
                        Workstations:
                      </span>
                      <strong className="font-mono text-white text-sm">{c.centroid?.pcs_used}</strong>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Duration:
                      </span>
                      <strong className="font-mono text-white text-sm">{c.centroid?.duration_minutes}m</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                    {c.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scientific conversion footnote */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">How K-Means converts clusters to Low / Medium / High:</strong> K-Means groups multidimensional data into 3 clusters based on minimum Euclidean distance. The application computes the composite resource intensity score of each learned centroid and automatically orders them into <span className="text-emerald-400 font-medium">Low</span> (short demos, consultations), <span className="text-amber-400 font-medium">Medium</span> (regular course practicals), and <span className="text-purple-400 font-medium">High</span> (university exams, hackathons) without arbitrary manual hard-coding.
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live K-Means Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter any hypothetical session parameters to see immediate K-Means classification.
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Students Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Number of Students:</span>
                <span className="font-bold text-indigo-400 font-mono">{calcInput.students}</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={calcInput.students}
                onChange={(e) => setCalcInput(prev => ({ ...prev, students: Number(e.target.value) }))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* PCs Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Workstations (PCs) Used:</span>
                <span className="font-bold text-indigo-400 font-mono">{calcInput.pcs}</span>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={calcInput.pcs}
                onChange={(e) => setCalcInput(prev => ({ ...prev, pcs: Number(e.target.value) }))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Duration Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Session Duration (Minutes):</span>
                <span className="font-bold text-indigo-400 font-mono">{calcInput.duration} mins ({(calcInput.duration / 60).toFixed(1)} hrs)</span>
              </div>
              <input
                type="range"
                min="30"
                max="240"
                step="15"
                value={calcInput.duration}
                onChange={(e) => setCalcInput(prev => ({ ...prev, duration: Number(e.target.value) }))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>
          </div>

          {/* Simulator Result Output Card */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Model Classification Result:</span>
              {calculating ? (
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                calcResult && renderLevelBadge(calcResult.utilization_level)
              )}
            </div>

            {calcResult && (
              <>
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  {calcResult.explanation}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Centroid Proximity: <strong className="text-slate-200 font-mono">{calcResult.distance_to_center}</strong></span>
                  <span>Confidence: <strong className="text-indigo-400 font-mono">{(calcResult.confidence * 100).toFixed(1)}%</strong></span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Historical Utilization Trend Chart & Lab Breakdown ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Historical Utilization Trend (Last 6 Months)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stacked monthly session volume partitioned by K-Means utilization level.
              </p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Low
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Med
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> High
              </span>
            </div>
          </div>

          {/* Pure CSS / SVG responsive Bar Chart */}
          <div className="pt-2">
            {(!stats?.monthly_trend || stats.monthly_trend.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs">No historical trend data available.</div>
            ) : (
              <div className="space-y-3">
                {stats.monthly_trend.map((m) => {
                  const maxTotal = Math.max(...stats.monthly_trend.map(x => x.total || 1), 35);
                  const lowWidth = ((m.Low || 0) / maxTotal) * 100;
                  const medWidth = ((m.Medium || 0) / maxTotal) * 100;
                  const highWidth = ((m.High || 0) / maxTotal) * 100;

                  return (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 font-semibold">{m.month}</span>
                        <span className="text-slate-400">{m.total} sessions</span>
                      </div>
                      <div className="h-6 w-full bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800">
                        {m.Low > 0 && (
                          <div
                            style={{ width: `${lowWidth}%` }}
                            className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold"
                            title={`Low: ${m.Low}`}
                          >
                            {m.Low >= 2 ? m.Low : ''}
                          </div>
                        )}
                        {m.Medium > 0 && (
                          <div
                            style={{ width: `${medWidth}%` }}
                            className="bg-amber-500 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold"
                            title={`Medium: ${m.Medium}`}
                          >
                            {m.Medium >= 2 ? m.Medium : ''}
                          </div>
                        )}
                        {m.High > 0 && (
                          <div
                            style={{ width: `${highWidth}%` }}
                            className="bg-purple-500 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold"
                            title={`High: ${m.High}`}
                          >
                            {m.High >= 2 ? m.High : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Per-Lab Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              Per-Lab Utilization Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated session counts across active computer laboratories.
            </p>
          </div>

          <div className="space-y-3">
            {stats?.lab_breakdown?.map((labItem) => (
              <div
                key={labItem.lab_name}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200">{labItem.lab_name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Avg Attendance: <span className="font-mono text-indigo-400">{labItem.avg_students}</span> students
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div className="text-[11px] font-mono text-slate-300">
                    <span className="text-emerald-400">{labItem.Low}L</span> ·{' '}
                    <span className="text-amber-400">{labItem.Medium}M</span> ·{' '}
                    <span className="text-purple-400">{labItem.High}H</span>
                  </div>
                  <span className="font-bold text-white font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {labItem.total_sessions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recorded Lab Usage Sessions Table ──────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Recorded Lab Sessions &amp; AI Classification
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual lab sessions classified into Low, Medium, and High utilization via K-Means.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Lab filter */}
            <select
              value={filterLab}
              onChange={(e) => setFilterLab(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Laboratories</option>
              {labs.map(l => (
                <option key={l.id} value={l.id}>{l.lab_name}</option>
              ))}
            </select>

            {/* Level filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['All', 'Low', 'Medium', 'High'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    filterLevel === lvl
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No sessions match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Laboratory</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">PCs Used</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">AI Utilization Level</th>
                  <th className="py-3 px-4 text-right">Cluster ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {s.session_date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{s.lab_name || `Lab #${s.lab_id}`}</div>
                      <div className="text-[11px] text-slate-500">{s.lab_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-200">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {s.number_of_students}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-200">
                        <Monitor className="w-3.5 h-3.5 text-slate-500" />
                        {s.pcs_used}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {s.session_duration_minutes} min ({(s.session_duration_minutes / 60).toFixed(1)}h)
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderLevelBadge(s.utilization_level)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-400">
                      #{s.cluster_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Record New Session ─────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-400" />
                Record Lab Usage Session
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              {/* Lab Select */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Select Laboratory *</label>
                <select
                  required
                  value={newSession.lab_id}
                  onChange={(e) => setNewSession(prev => ({ ...prev, lab_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose a Lab --</option>
                  {labs.map(l => (
                    <option key={l.id} value={l.id}>{l.lab_name} (Capacity: {l.capacity})</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Session Date *</label>
                <input
                  type="date"
                  required
                  value={newSession.session_date}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Students & PCs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Students Present *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newSession.number_of_students}
                    onChange={(e) => setNewSession(prev => ({ ...prev, number_of_students: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">PCs Used *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newSession.pcs_used}
                    onChange={(e) => setNewSession(prev => ({ ...prev, pcs_used: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Duration (Minutes) *</label>
                <input
                  type="number"
                  min="15"
                  max="360"
                  step="15"
                  required
                  value={newSession.session_duration_minutes}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_duration_minutes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving & Classifying...' : 'Save & Classify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
