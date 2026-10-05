import React, { useState, useEffect } from 'react';
import { 
  History, Monitor, Cpu, HardDrive, Wrench, CheckCircle2,
  Clock, AlertTriangle, Calendar, User, ArrowRight, RefreshCw,
  SlidersHorizontal, Check
} from 'lucide-react';
import { maintenanceService, pcService, labService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

export const PCMaintenanceHistory = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'lab_assistant';

  const [labs, setLabs] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedPcId, setSelectedPcId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    labService.getAll({ page_size: 100 }).then(d => setLabs(d.items || [])).catch(console.error);
    pcService.getAll({ page_size: 150 }).then(d => {
      setPcs(d.items || []);
      if (d.items?.length > 0 && !selectedPcId) {
        setSelectedPcId(String(d.items[0].id));
      }
    }).catch(console.error);
  }, []);

  // Filter PCs when lab changes
  const filteredPCs = selectedLabId 
    ? pcs.filter(p => p.lab_id === Number(selectedLabId))
    : pcs;

  // Load history whenever selectedPcId changes
  useEffect(() => {
    if (!selectedPcId) return;
    setIsLoading(true);
    maintenanceService.getPCHistory(Number(selectedPcId))
      .then(setHistoryData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedPcId]);

  // Handle status toggle
  const handleToggleStatus = async () => {
    if (!historyData?.pc) return;
    const current = (historyData.pc.status || '').toLowerCase();
    const target = current === 'maintenance' ? 'working' : 'maintenance';
    setIsToggling(true);
    try {
      await maintenanceService.setPCStatus(historyData.pc.id, target, `Status changed by ${user?.name} on history page`);
      // Reload history & PC list
      const updatedHistory = await maintenanceService.getPCHistory(historyData.pc.id);
      setHistoryData(updatedHistory);
      const updatedPCs = await pcService.getAll({ page_size: 150 });
      setPcs(updatedPCs.items || []);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    } finally {
      setIsToggling(false);
    }
  };

  const pc = historyData?.pc;
  const records = historyData?.records || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="PC Maintenance History"
        subtitle="Complete chronological audit trail of repairs, servicing, and component changes per workstation"
        badge="Phase 3"
      />

      {/* Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Lab Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Filter Lab
            </label>
            <select
              value={selectedLabId}
              onChange={(e) => {
                setSelectedLabId(e.target.value);
                // reset or pick first
                const firstMatching = pcs.find(p => !e.target.value || p.lab_id === Number(e.target.value));
                if (firstMatching) setSelectedPcId(String(firstMatching.id));
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-48"
            >
              <option value="">All Laboratories</option>
              {labs.map(l => (
                <option key={l.id} value={l.id}>{l.lab_code} - {l.lab_name}</option>
              ))}
            </select>
          </div>

          {/* PC Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select Machine
            </label>
            <select
              value={selectedPcId}
              onChange={(e) => setSelectedPcId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-64"
            >
              {filteredPCs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.pc_code} — {p.computer_name} ({p.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick status switch button */}
        {pc && canEdit && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Current Status:</span>
            <Badge value={pc.status} className="text-xs px-2.5 py-1" />
            <button
              onClick={handleToggleStatus}
              disabled={isToggling}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 shadow-sm ${
                (pc.status || '').toLowerCase() === 'maintenance'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/30'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {isToggling ? 'Updating...' : ((pc.status || '').toLowerCase() === 'maintenance' ? 'Set to Working' : 'Set to Maintenance')}
              </span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500">Loading workstation maintenance history...</p>
        </div>
      ) : pc ? (
        <div className="space-y-6">
          {/* Workstation Specification Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono">{pc.pc_code}</h3>
                    <Badge value={pc.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{pc.computer_name} • {pc.lab_name} ({pc.lab_code})</p>
                </div>
              </div>

              {/* Counts */}
              <div className="flex items-center gap-4 text-xs">
                <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Total Events</p>
                  <p className="text-base font-bold text-white">{historyData.total_records}</p>
                </div>
                <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Completed</p>
                  <p className="text-base font-bold text-emerald-400">{historyData.completed_records}</p>
                </div>
              </div>
            </div>

            {/* Hardware Specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <p className="text-slate-500 text-[11px]">Processor</p>
                <p className="font-semibold text-slate-200 truncate mt-0.5">{pc.processor || 'N/A'}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <p className="text-slate-500 text-[11px]">Memory (RAM)</p>
                <p className="font-semibold text-slate-200 truncate mt-0.5">{pc.ram || 'N/A'}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <p className="text-slate-500 text-[11px]">Storage Drive</p>
                <p className="font-semibold text-slate-200 truncate mt-0.5">{pc.storage || 'N/A'}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <p className="text-slate-500 text-[11px]">Operating System</p>
                <p className="font-semibold text-slate-200 truncate mt-0.5">{pc.operating_system || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Timeline of Maintenance Events */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Service & Maintenance Timeline</span>
            </h4>

            {records.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No maintenance history recorded"
                description={`Workstation ${pc.pc_code} has no previous maintenance or repair records.`}
              />
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {records.map((rec) => {
                  const isCompleted = rec.status === 'Completed';
                  return (
                    <div
                      key={rec.id}
                      className="relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-sm space-y-3"
                    >
                      {/* Timeline dot */}
                      <span className={`absolute -left-[27px] top-6 w-3 h-3 rounded-full border-2 border-slate-950 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                      }`} />

                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            Task #{rec.id}
                          </span>
                          <span className="text-sm font-semibold text-white">{rec.maintenance_type}</span>
                          {rec.complaint && (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                              Ticket: {rec.complaint.complaint_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge value={rec.status} />
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {rec.issue_description}
                      </p>

                      {/* Notes if any */}
                      {rec.notes && (
                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/60 text-xs">
                          <p className="text-slate-400 font-semibold mb-1">Technician Notes:</p>
                          <p className="text-slate-300 font-mono whitespace-pre-wrap">{rec.notes}</p>
                        </div>
                      )}

                      {/* Meta footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Started: {new Date(rec.start_date).toLocaleDateString()}</span>
                          </span>
                          {rec.completion_date && (
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed: {new Date(rec.completion_date).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                        {rec.assigned_technician && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>Technician: <strong className="text-slate-200">{rec.assigned_technician.name}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
