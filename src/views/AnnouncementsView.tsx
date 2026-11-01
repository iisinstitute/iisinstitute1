import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Send,
  Users,
} from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Announcement } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';

export const AnnouncementsView: React.FC = () => {
  const { announcements, batches, createAnnouncement, deleteAnnouncement } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [targetId, setTargetId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      await createAnnouncement(
        {
          title,
          content,
          targetAudience,
          targetId: targetId || undefined,
          priority,
          createdBy: currentUser.name,
        },
        currentUser.name
      );
      showToast(`Announcement "${title}" broadcasted successfully!`);
      setIsModalOpen(false);
      setTitle('');
      setContent('');
    } catch (err) {
      showToast('Error broadcasting announcement.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id, currentUser.name);
      showToast('Notice removed.');
    } catch (err) {
      showToast('Error deleting announcement.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Notice & Announcements Board</h1>
          <p className="text-xs text-gray-500">
            Publish circulars, holiday notices, PTM alerts, and syllabus updates to parents and faculty.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Post Circular Notice</span>
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-xs text-gray-400">
            No notices posted yet.
          </div>
        ) : (
          announcements.map(ann => (
            <div
              key={ann.id}
              className={`rounded-2xl border p-5 shadow-xs transition-all ${
                ann.priority === 'urgent'
                  ? 'border-rose-200 bg-linear-to-r from-rose-50/50 to-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                      Target: {ann.targetAudience.toUpperCase()} {ann.targetId ? `(${ann.targetId})` : ''}
                    </span>
                    {ann.priority === 'urgent' && (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> URGENT
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-gray-900">{ann.title}</h3>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="rounded-lg p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-700 leading-relaxed">{ann.content}</p>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Issued by: <strong>{ann.createdBy}</strong></span>
                <span>{new Date(ann.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* POST NOTICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post New Circular / Notice"
        subtitle="Broadcast to parents and faculty"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Circular Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Mandatory Parent-Teacher Meeting (Term 1)"
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Audience *</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">All (Parents & Faculty)</option>
                <option value="parents">All Parents Only</option>
                <option value="teachers">Teaching Staff Only</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="normal">Normal Bulletin</option>
                <option value="urgent">Urgent Alert</option>
              </select>
            </div>
          </div>

          {targetAudience === 'batch' && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Batch</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Select Target Batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.batchId}>
                    {b.batchId} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">Notice Content *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write the full circular notice here..."
              className="w-full rounded-xl border border-gray-200 py-2 px-3 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700"
            >
              Broadcast Circular
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
