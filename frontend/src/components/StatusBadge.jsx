/**
 * StatusBadge — small colored pill for status values.
 * Pass `statusMap` like:
 *   { active: 'green', inactive: 'gray', maintenance: 'amber' }
 */
const colorMap = {
  green:  'bg-green-100 text-green-700 border border-green-200',
  red:    'bg-red-100 text-red-700 border border-red-200',
  amber:  'bg-amber-100 text-amber-700 border border-amber-200',
  blue:   'bg-blue-100 text-blue-700 border border-blue-200',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
};

const defaultLabStatus = {
  active: 'green',
  inactive: 'gray',
  maintenance: 'amber',
  closed: 'red',
};

const defaultPCStatus = {
  working: 'green',
  available: 'blue',
  in_use: 'indigo',
  maintenance: 'amber',
  not_working: 'red',
};

const defaultInventoryStatus = {
  available: 'green',
  in_use: 'blue',
  maintenance: 'amber',
  disposed: 'red',
};

const defaultCondition = {
  new: 'green',
  good: 'blue',
  fair: 'amber',
  poor: 'amber',
  damaged: 'red',
};

const defaultUserStatus = {
  active: 'green',
  inactive: 'gray',
};

const defaultUserRole = {
  admin: 'purple',
  faculty: 'blue',
  lab_assistant: 'indigo',
  student: 'green',
};

const defaultComplaintStatus = {
  open: 'blue',
  assigned: 'indigo',
  in_progress: 'amber',
  resolved: 'green',
  closed: 'gray',
};

const defaultSeverity = {
  low: 'blue',
  medium: 'amber',
  high: 'red',
};

const defaultPriority = {
  low: 'gray',
  medium: 'blue',
  high: 'amber',
  urgent: 'red',
};

const defaultMaintenanceStatus = {
  pending: 'amber',
  in_progress: 'indigo',
  completed: 'green',
};

const defaultBookingStatus = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
  completed: 'blue',
};

export {
  defaultLabStatus,
  defaultPCStatus,
  defaultInventoryStatus,
  defaultCondition,
  defaultUserStatus,
  defaultUserRole,
  defaultComplaintStatus,
  defaultSeverity,
  defaultPriority,
  defaultMaintenanceStatus,
  defaultBookingStatus,
};

export default function StatusBadge({ value, statusMap }) {
  if (value === null || value === undefined) return null;
  const key = String(value).toLowerCase();
  const label = String(value).replace(/_/g, ' ');
  const color = (statusMap && (statusMap[key] || statusMap[value])) || 'gray';
  const cls = colorMap[color] || colorMap.gray;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}
