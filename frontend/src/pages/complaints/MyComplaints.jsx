import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Clock, CheckCircle2, AlertCircle,
  Laptop, Calendar, User, Eye, ArrowUpRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { complaintService } from '../../services/services';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { EmptyState } from '../../components/EmptyState';

const STATUS_STEPS = ['Open', 'Assigned', 'In Progress', 'Resolved'];

export const MyComplaints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchMyComplaints = useCallback(() => {
    setIsLoading(true);
    complaintService.getMyComplaints({
      page,
      page_size: 10,
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchMyComplaints();
  }, [fetchMyComplaints]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const getStepIndex = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 0;
    if (s === 'assigned') return 1;
    if (s === 'in progress' || s === 'in_progress') return 2;
    if (s === 'resolved' || s === 'closed') return 3;
    return 0;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="My Complaints"
        subtitle="Track status, technician assignments, and resolution notes for your reported issues"
        action={{
          label: 'Submit Complaint',
          icon: Plus,
          onClick: () => navigate('/complaints/new'),
        }}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { label: 'All', value: '' },
            { label: 'Open', value: 'Open' },
            { label: 'Assigned', value: 'Assigned' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Resolved', value: 'Resolved' },
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, type, issue..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500">Loading your complaint records...</p>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No complaints found"
          description={
            search || statusFilter
              ? "No complaints match your current filter criteria."
              : "You haven't submitted any complaints yet. Report a computer issue whenever you encounter one."
          }
          action={{
            label: "Submit a Complaint",
            onClick: () => navigate('/complaints/new'),
          }}
        />
      ) : (
        <div className="space-y-4">
          {data.items.map((complaint) => {
            const currentStep = getStepIndex(complaint.status);
            return (
              <div
                key={complaint.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 transition-all shadow-sm space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {complaint.complaint_code}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{complaint.complaint_type}</h4>
                      <p className="text-[11px] text-slate-400">
                        {complaint.pc?.pc_code ? `${complaint.pc.pc_code} (${complaint.pc.computer_name})` : 'General PC'} 
                        {complaint.lab?.lab_name ? ` • ${complaint.lab.lab_name}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge value={complaint.severity} label={`Severity: ${complaint.severity}`} />
                    <Badge value={complaint.status} />
                    <button
                      onClick={() => setSelectedTicket(complaint)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {complaint.description}
                </p>

                {/* Status Timeline Progress Bar */}
                <div className="pt-2">
                  <div className="grid grid-cols-4 gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      return (
                        <div key={step} className="space-y-1">
                          <div className={`h-1.5 rounded-full transition-all ${
                            isCompleted 
                              ? (isCurrent && complaint.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-600')
                              : 'bg-slate-800'
                          }`} />
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-semibold ${
                              isCurrent ? 'text-white' : (isCompleted ? 'text-slate-400' : 'text-slate-600')
                            }`}>
                              {step}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notes & meta */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    </span>
                    {complaint.assigned_user && (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>Assigned to: <strong className="text-slate-200">{complaint.assigned_user.name}</strong></span>
                      </span>
                    )}
                  </div>

                  {complaint.resolved_at && (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved on {new Date(complaint.resolved_at).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            totalItems={data.total}
            pageSize={data.page_size}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          title={`Ticket Details — ${selectedTicket.complaint_code}`}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          size="lg"
        >
          <div className="space-y-5">
            {/* Status Header */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Current Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge value={selectedTicket.status} className="text-xs px-2.5 py-1" />
                  <Badge value={selectedTicket.severity} label={`Severity: ${selectedTicket.severity}`} />
                  <Badge value={selectedTicket.priority} label={`Priority: ${selectedTicket.priority}`} />
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</p>
                {selectedTicket.resolved_at && (
                  <p className="text-emerald-400 font-medium mt-0.5">
                    Resolved: {new Date(selectedTicket.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* PC and Lab Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-500 font-medium">Workstation</p>
                <p className="text-sm font-semibold text-white">{selectedTicket.pc?.pc_code || 'N/A'}</p>
                <p className="text-slate-400">{selectedTicket.pc?.computer_name}</p>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <p className="text-slate-500 font-medium">Laboratory</p>
                <p className="text-sm font-semibold text-white">{selectedTicket.lab?.lab_name || 'N/A'}</p>
                <p className="text-slate-400">{selectedTicket.lab?.location || selectedTicket.lab?.lab_code}</p>
              </div>
            </div>

            {/* Issue Description */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <p className="text-xs font-semibold text-slate-400">Issue Description</p>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            {/* Technician & Maintenance Notes */}
            {selectedTicket.notes && (
              <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Technical Support & Maintenance Log</span>
                </p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {selectedTicket.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
