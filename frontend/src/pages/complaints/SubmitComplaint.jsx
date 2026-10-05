import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, Monitor, Cpu, Laptop,
  HelpCircle, Send, ArrowRight, HardDrive, Wifi, Keyboard,
  Mouse, Info
} from 'lucide-react';
import { complaintService, labService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';

const COMPLAINT_TYPES = [
  { label: 'Computer not starting', icon: Laptop, desc: 'No power, boot loop, or black screen' },
  { label: 'Slow computer', icon: Cpu, desc: 'Extreme sluggishness, app freezing, high CPU' },
  { label: 'Network issue', icon: Wifi, desc: 'Cannot connect to internet or lab network' },
  { label: 'Software issue', icon: HardDrive, desc: 'OS crash, missing software, or license errors' },
  { label: 'Keyboard issue', icon: Keyboard, desc: 'Keys not responding or physical damage' },
  { label: 'Mouse issue', icon: Mouse, desc: 'Cursor jumping, clicks not registering' },
  { label: 'Monitor issue', icon: Monitor, desc: 'Flickering, distorted colors, or no display' },
  { label: 'Other', icon: HelpCircle, desc: 'Audio, power outlet, or other laboratory issue' },
];

const SEVERITIES = [
  { value: 'Low', label: 'Low', desc: 'Minor issue, PC is still usable', border: 'hover:border-emerald-500/50', active: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
  { value: 'Medium', label: 'Medium', desc: 'Significant issue, work impeded', border: 'hover:border-amber-500/50', active: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  { value: 'High', label: 'High', desc: 'Workstation completely non-functional', border: 'hover:border-rose-500/50', active: 'border-rose-500 bg-rose-500/10 text-rose-400' },
];

export const SubmitComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [labs, setLabs] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [selectedLab, setSelectedLab] = useState('');
  const [selectedPcId, setSelectedPcId] = useState('');
  const [complaintType, setComplaintType] = useState('Computer not starting');
  const [severity, setSeverity] = useState('Medium');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  // Load labs on mount
  useEffect(() => {
    labService.getAll({ page_size: 100 })
      .then(d => setLabs(d.items || []))
      .catch(console.error);
  }, []);

  // Load PCs whenever selectedLab changes
  useEffect(() => {
    complaintService.getLookupPCs(selectedLab ? Number(selectedLab) : undefined)
      .then(data => {
        setPcs(data || []);
        // Reset selected PC if it's no longer in the list
        if (selectedPcId && !data.some(p => p.id === Number(selectedPcId))) {
          setSelectedPcId('');
        }
      })
      .catch(console.error);
  }, [selectedLab]);

  const selectedPC = pcs.find(p => p.id === Number(selectedPcId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPcId) {
      setError('Please select the computer having the issue.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a description of at least 5 characters.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const payload = {
        pc_id: Number(selectedPcId),
        lab_id: selectedPC?.lab_id || (selectedLab ? Number(selectedLab) : null),
        complaint_type: complaintType,
        severity: severity,
        priority: priority,
        description: description.trim(),
      };
      const res = await complaintService.create(payload);
      setSubmittedData(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setDescription('');
    setSelectedPcId('');
    setError('');
  };

  if (submittedData) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl shadow-black/40">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Complaint Submitted Successfully!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Your complaint ticket has been logged and queued for our laboratory technical support staff.
          </p>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 max-w-sm mx-auto mb-8 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Ticket Code:</span>
              <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {submittedData.complaint_code}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Workstation:</span>
              <span className="font-semibold text-slate-200">{selectedPC?.pc_code || 'PC'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Issue Type:</span>
              <span className="text-slate-300">{submittedData.complaint_type}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Severity:</span>
              <Badge value={submittedData.severity} />
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Initial Status:</span>
              <Badge value={submittedData.status} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/complaints/my')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <span>Track in My Complaints</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all"
            >
              Submit Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Submit Complaint"
        subtitle="Report hardware, software, or peripheral malfunctions for immediate lab assistance"
        badge="Phase 3"
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Workstation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center border border-blue-500/30">1</span>
              <h3 className="text-base font-semibold text-white">Select Location & Workstation</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Filter by Lab (Optional)
                </label>
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Laboratories</option>
                  {labs.map(l => (
                    <option key={l.id} value={l.id}>{l.lab_name} ({l.lab_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Computer / PC Workstation <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedPcId}
                  onChange={(e) => setSelectedPcId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">-- Choose a Computer --</option>
                  {pcs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pc_code} — {p.computer_name} ({p.lab_code || 'Lab'}) [{p.status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Issue Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center border border-blue-500/30">2</span>
              <h3 className="text-base font-semibold text-white">Complaint Type & Category</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2.5">
                Select Complaint Type <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMPLAINT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = complaintType === t.label;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setComplaintType(t.label)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/15 text-white shadow-md shadow-blue-500/10'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{t.label}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Severity Level <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${s.border} ${
                        severity === s.value
                          ? s.active
                          : 'border-slate-800 bg-slate-950/60 text-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Priority (Manual Selection)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        priority === p
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Detailed Issue Description <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-slate-500">{description.length} characters</span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe what happened, any error messages displayed, unusual noises, LED blink codes, or steps to reproduce the problem..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          {/* Workstation Preview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>Target Machine Preview</span>
            </h4>

            {selectedPC ? (
              <div className="space-y-3">
                <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-white font-mono">{selectedPC.pc_code}</p>
                      <p className="text-xs text-slate-400">{selectedPC.computer_name}</p>
                    </div>
                    <Badge value={selectedPC.status} />
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                    <p><span className="text-slate-500">Lab:</span> {selectedPC.lab_name || 'N/A'}</p>
                    <p><span className="text-slate-500">Lab Code:</span> {selectedPC.lab_code || 'N/A'}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Lab assistants can quickly locate the computer using the workstation code.</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <Laptop className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                <span>Select a computer on the left to view machine details</span>
              </div>
            )}
          </div>

          {/* Submitter Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted By</h4>
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80">
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-2">
                <Badge value={user?.role} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ticket status updates and resolution notes will be tracked in your "My Complaints" portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
