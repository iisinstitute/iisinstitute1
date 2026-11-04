import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Activity,
  Lock,
  Trash2,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { exportToExcel } from '../components/export/ExportUtils.ts';
import { ConfirmDialog } from '../components/common/ConfirmDialog.tsx';
import { AuditLogItem } from '../types/index.ts';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, deleteAuditLog, clearAuditLogs } = useData();
  const { isSuperAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<AuditLogItem | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch =
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchEntity = selectedEntity === 'all' || log.entityType === selectedEntity;
      return matchSearch && matchEntity;
    });
  }, [auditLogs, searchQuery, selectedEntity]);

  const handleExport = () => {
    exportToExcel(
      filteredLogs.map(l => ({
        'Timestamp': l.timestamp,
        'Action': l.action,
        'Entity Type': l.entityType,
        'Entity ID': l.entityId,
        'Performed By': l.performedBy,
        'Role': l.userRole,
        'Details': l.details,
      })),
      `IIS_Audit_Logs_${new Date().toISOString().split('T')[0]}`
    );
    showToast('Exported audit trail to Excel.');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAuditLog(deleteTarget.id);
      showToast('Audit record removed.');
      setDeleteTarget(null);
    } catch {
      showToast('Error removing audit log.');
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearAuditLogs();
      showToast('All audit logs cleared.');
      setIsClearAllOpen(false);
    } catch {
      showToast('Error clearing logs.');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-200">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Super Admin Access Only</h2>
        <p className="mt-1 text-xs text-gray-500 max-w-md">
          The security audit trail and institutional compliance logs can only be inspected with Super Admin privileges.
        </p>
      </div>
    );
  }

  const entityTypes = Array.from(new Set(auditLogs.map(l => l.entityType)));

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Security & Audit Trail</h1>
          <p className="text-xs text-gray-500">
            Operation history: admissions, fee corrections, attendance adjustments, and faculty punches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {auditLogs.length > 0 && (
            <button
              onClick={() => setIsClearAllOpen(true)}
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Log Trail</span>
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search audit actions, user, details..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 px-3 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Entity Types</option>
              {entityTypes.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 block">{log.action}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {log.entityType}
                      </span>
                      <span className="block font-mono text-[10px] text-gray-500 mt-0.5">{log.entityId}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-800">{log.performedBy}</span>
                      <span className="block text-[10px] text-gray-400 font-semibold">{log.userRole}</span>
                    </td>

                    <td className="py-3 px-4 text-gray-600 text-[11px] max-w-md leading-relaxed">
                      {log.details}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteTarget(log)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete audit entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE ENTRY DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Audit Entry?"
        message={`Are you sure you want to remove the audit entry for "${deleteTarget?.action}" (${deleteTarget?.entityType})?`}
        confirmLabel="Delete Entry"
      />

      {/* CONFIRM CLEAR ALL DIALOG */}
      <ConfirmDialog
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear All Audit Trail Records?"
        message="Are you sure you want to completely erase the audit log trail? This action cannot be undone."
        confirmLabel="Clear All Logs"
      />
    </div>
  );
};
