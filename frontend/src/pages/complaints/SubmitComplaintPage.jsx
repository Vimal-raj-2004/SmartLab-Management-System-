import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Send, CheckCircle2, Loader2, ArrowLeft, Bot, Sparkles, Check, Info } from 'lucide-react';
import { complaintService, pcService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const COMPLAINT_TYPES = [
  'Computer not starting',
  'Slow computer',
  'Network issue',
  'Software issue',
  'Keyboard issue',
  'Mouse issue',
  'Monitor issue',
  'Other',
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low — Minor issue, PC still usable' },
  { value: 'medium', label: 'Medium — Affects work, partially usable' },
  { value: 'high', label: 'High — PC unusable, needs immediate attention' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const selectClass =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-slate-600 bg-slate-700 text-white ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
  'placeholder-slate-400 transition-colors';

const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

export default function SubmitComplaintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pcs, setPcs] = useState([]);
  const [types, setTypes] = useState(COMPLAINT_TYPES);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Phase 5C: AI Priority Assistant State
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceTimerRef = useRef(null);

  const [formData, setFormData] = useState({
    pc_id: '',
    complaint_type: '',
    severity: 'medium',
    priority: 'medium',
    final_priority: 'medium',
    description: '',
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Load PCs — not critical if it fails
        const pcsRes = await pcService.list({ page_size: 100 });
        if (!cancelled) {
          setPcs(pcsRes.data?.items ?? []);
        }
      } catch (err) {
        // PCs list failed (e.g., 401 or backend down) — continue without PC list
        console.warn('Could not load PC list:', err?.message);
      }

      try {
        // Load types from backend — fall back to static list on failure
        const typesRes = await complaintService.getTypes();
        if (!cancelled && Array.isArray(typesRes.data) && typesRes.data.length > 0) {
          setTypes(typesRes.data);
        }
      } catch (err) {
        console.warn('Could not load complaint types from backend, using defaults:', err?.message);
        // types already pre-populated with COMPLAINT_TYPES constant above
      }

      if (!cancelled) setLoading(false);
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── Phase 5C: Debounced AI Priority Prediction ───────────────────────────
  useEffect(() => {
    const desc = formData.description?.trim();
    if (!desc || desc.length < 5) {
      setAiPrediction(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await complaintService.predictPriority({
          description: desc,
          complaint_type: formData.complaint_type || 'Other',
          severity: formData.severity || 'medium',
        });
        setAiPrediction(res.data);
      } catch (err) {
        console.warn('AI priority prediction:', err?.message);
      } finally {
        setAiLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [formData.description, formData.complaint_type, formData.severity]);

  const handleApplyAiPriority = () => {
    if (aiPrediction?.predicted_priority) {
      setFormData((prev) => ({
        ...prev,
        priority: aiPrediction.predicted_priority,
        final_priority: aiPrediction.predicted_priority,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.complaint_type) {
      setError('Please select a complaint type.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please enter a description.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pc_id: formData.pc_id ? Number(formData.pc_id) : null,
        complaint_type: formData.complaint_type,
        severity: formData.severity,
        priority: formData.priority,
        final_priority: formData.priority,
        description: formData.description.trim(),
      };

      await complaintService.create(payload);
      setSuccess(true);
      setTimeout(() => {
        const rolePrefix = user?.role === 'lab_assistant' ? 'assistant' : user?.role;
        navigate(`/${rolePrefix}/complaints`);
      }, 1800);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Failed to submit complaint. Please check your inputs and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Loading form…</p>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Complaint Submitted!</h2>
        <p className="text-slate-400 text-sm">Redirecting to your complaints dashboard…</p>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-0 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Submit a Complaint</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Report a computer, hardware, or network problem in the lab
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* PC Selection */}
          <div>
            <label className={labelClass}>
              Affected PC <span className="text-slate-500 font-normal text-xs">(optional)</span>
            </label>
            <select
              name="pc_id"
              value={formData.pc_id}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">— Select a computer —</option>
              {pcs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pc_code} — {p.computer_name}
                  {p.lab ? ` (${p.lab.lab_name})` : ''}
                </option>
              ))}
            </select>
            {pcs.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No PCs loaded — you can still submit without selecting one.
              </p>
            )}
          </div>

          {/* Complaint Type */}
          <div>
            <label className={labelClass}>
              Issue Type <span className="text-red-400">*</span>
            </label>
            <select
              name="complaint_type"
              value={formData.complaint_type}
              onChange={handleChange}
              required
              className={selectClass}
            >
              <option value="">— Select issue type —</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Severity & Priority (responsive grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Severity <span className="text-red-400">*</span>
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                required
                className={selectClass}
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Priority <span className="text-red-400">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className={selectClass}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe the problem in detail — what happened, any error messages, steps to reproduce…"
              className={`${selectClass} resize-none`}
            />
          </div>

          {/* Phase 5C: AI Priority Assistant Card */}
          {aiLoading && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-2.5 text-xs text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>AI analyzing description keywords with TF-IDF vectorizer…</span>
            </div>
          )}

          {aiPrediction && !aiLoading && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    AI Decision Tree Priority Assessment
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                      aiPrediction.predicted_priority === 'high'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : aiPrediction.predicted_priority === 'medium'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    Suggested: {aiPrediction.predicted_priority} ({(aiPrediction.confidence * 100).toFixed(0)}%)
                  </span>

                  {formData.priority !== aiPrediction.predicted_priority && (
                    <button
                      type="button"
                      onClick={handleApplyAiPriority}
                      className="px-2.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3" />
                      Apply AI Priority
                    </button>
                  )}
                </div>
              </div>

              {/* Detected terms */}
              {aiPrediction.detected_terms && aiPrediction.detected_terms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-xs text-slate-400">Detected Key Terms:</span>
                  {aiPrediction.detected_terms.map((term, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-mono"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                {aiPrediction.reason}
              </p>

              <p className="text-[11px] text-slate-500 italic">
                * Note: Model uses mathematical TF-IDF keyword weighting & Decision Tree rules. Lab technicians review all tickets and can modify the final priority.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-600 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Complaint
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
