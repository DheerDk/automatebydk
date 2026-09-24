import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Clock,
  Plus,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit3,
  Power,
  RotateCcw,
  Tag,
  User,
  ExternalLink,
  ChevronDown,
  X,
  Send,
  Info,
} from 'lucide-react';

interface DripStep {
  id?: string;
  stepOrder: number;
  delayMinutes: number;
  messageType?: string;
  messageContent: string;
  mediaUrl?: string;
  buttonOptions?: Array<{ id: string; title: string }> | string;
}

interface DripSequence {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerStatus?: string;
  isActive: boolean;
  steps: DripStep[];
  stats?: {
    totalEnrollments: number;
    activeCount: number;
    completedCount: number;
    repliedCount: number;
    convertedCount: number;
    conversionRate: number;
  };
}

export const DripSequenceManager: React.FC = () => {
  const [sequences, setSequences] = useState<DripSequence[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<DripSequence | null>(null);

  // Form State for creating/editing sequence
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerStatus, setFormTriggerStatus] = useState('INTERESTED');
  const [formSteps, setFormSteps] = useState<DripStep[]>([
    {
      stepOrder: 1,
      delayMinutes: 120, // 2 Hours
      messageContent: 'Hi {{customer_name}}! We noticed you were interested in {{product_name}}. Do you have any questions or need sizing assistance? Reply anytime!',
      buttonOptions: [
        { id: 'btn_ask_details', title: '❓ Ask Sizing' },
        { id: 'btn_place_order', title: '🛍️ Order Now' },
      ],
    },
    {
      stepOrder: 2,
      delayMinutes: 1440, // 24 Hours
      messageContent: 'Exclusive 10% OFF for you, {{customer_name}}! 🎉 Use Code: *SAVE10* today on {{product_name}} before stock runs out.',
      buttonOptions: [
        { id: 'btn_claim_offer', title: '🏷️ Claim 10% OFF' },
        { id: 'btn_talk_staff', title: '💬 Chat with Staff' },
      ],
    },
    {
      stepOrder: 3,
      delayMinutes: 4320, // 3 Days
      messageContent: 'Hi {{customer_name}}, just checking in one last time! Should we hold your reserved {{product_name}} or close this inquiry?',
      buttonOptions: [
        { id: 'btn_keep_open', title: '⏳ Hold Order' },
        { id: 'btn_close', title: '❌ Not Now' },
      ],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSequences = async () => {
    try {
      const [resSeq, resStats] = await Promise.all([
        api.get('/drip-sequences'),
        api.get('/drip-sequences/stats'),
      ]);
      if ((resSeq as any)?.data) {
        setSequences((resSeq as any).data);
      }
      if ((resStats as any)?.data) {
        setStats((resStats as any).data);
      }
    } catch (err) {
      console.error('Error fetching drip sequences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const handleToggleSequence = async (id: string) => {
    try {
      await api.patch(`/drip-sequences/${id}/toggle`);
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      console.error('Failed to toggle sequence:', err);
    }
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this follow-up drip sequence?')) return;
    try {
      await api.delete(`/drip-sequences/${id}`);
      setSequences((prev) => prev.filter((s) => s.id !== id));
      fetchSequences();
    } catch (err) {
      console.error('Failed to delete sequence:', err);
    }
  };

  const handleAddStep = () => {
    const nextOrder = formSteps.length + 1;
    const defaultDelay = nextOrder === 1 ? 120 : nextOrder === 2 ? 1440 : nextOrder === 3 ? 4320 : 10080;
    setFormSteps([
      ...formSteps,
      {
        stepOrder: nextOrder,
        delayMinutes: defaultDelay,
        messageContent: 'Hi {{customer_name}}, follow-up regarding {{product_name}} from {{business_name}}.',
        buttonOptions: [{ id: `btn_step_${nextOrder}`, title: '💬 Quick Reply' }],
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (formSteps.length <= 1) return;
    const updated = formSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setFormSteps(updated);
  };

  const handleUpdateStep = (index: number, field: keyof DripStep, value: any) => {
    const updated = [...formSteps];
    updated[index] = { ...updated[index], [field]: value };
    setFormSteps(updated);
  };

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes} Minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} Hours`;
    return `${Math.round(minutes / 1440)} Days`;
  };

  const handleOpenCreate = () => {
    setSelectedSequence(null);
    setFormName('High-Intent Abandoned Inquiry Sequence');
    setFormDescription('Automated multi-touch follow-up for leads inquiring about catalog products.');
    setFormTriggerStatus('INTERESTED');
    setIsCreateModalOpen(true);
  };

  const handleSubmitSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formSteps.length === 0) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        triggerType: 'LEAD_STATUS',
        triggerStatus: formTriggerStatus,
        steps: formSteps,
      };

      if (selectedSequence) {
        await api.put(`/drip-sequences/${selectedSequence.id}`, payload);
      } else {
        await api.post('/drip-sequences', payload);
      }

      setIsCreateModalOpen(false);
      fetchSequences();
      setFeedbackMsg({ type: 'success', text: 'Drip follow-up sequence saved and activated successfully!' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save sequence' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active Sequences</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {sequences.filter((s) => s.isActive).length} <span className="text-xs font-normal text-slate-400">/ {sequences.length}</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto-pilot triggers active
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">In-Flight Follow-ups</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {stats?.activeEnrollments || 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Leads currently in sequence
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Reactivations</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">
            {stats?.totalReactivations || 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Customers replied or bought
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Auto-Stop Safety</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-600 mt-2">
            100%
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            Auto-halts when customer replies
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Automated Abandoned Inquiry Recovery Engine</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Smart WhatsApp Drip Sequences</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Never lose a customer inquiry again. AutoMate automatically schedules smart follow-ups (2h, 24h, 3 days) when customers ask for prices or products, and immediately auto-cancels when they reply or pay.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="relative z-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Drip Sequence</span>
        </button>
      </div>

      {/* Sequences List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading drip sequences...</div>
        ) : sequences.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">No Drip Follow-up Sequences Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first sequence to automatically follow up with high-intent leads who ask for product details.
            </p>
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
            >
              Create Default 3-Step Sequence
            </button>
          </div>
        ) : (
          sequences.map((seq) => (
            <div
              key={seq.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:border-emerald-200 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-base text-slate-900">{seq.name}</h3>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        seq.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {seq.isActive ? '● ACTIVE' : '○ PAUSED'}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                      Trigger: Lead Status → {seq.triggerStatus || 'INTERESTED'}
                    </span>
                  </div>
                  {seq.description && (
                    <p className="text-xs text-slate-500">{seq.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSequence(seq.id)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      seq.isActive
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                    }`}
                    title="Toggle Active Status"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{seq.isActive ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSequence(seq.id)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Sequence"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Step Timeline Visualization */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Sequence Steps Timeline ({seq.steps.length} Steps)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {seq.steps.map((step, sIdx) => {
                    let btnList: any[] = [];
                    try {
                      btnList = typeof step.buttonOptions === 'string' ? JSON.parse(step.buttonOptions || '[]') : step.buttonOptions || [];
                    } catch {
                      btnList = [];
                    }

                    return (
                      <div
                        key={sIdx}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Step {step.stepOrder}
                          </span>
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            After {formatDelay(step.delayMinutes)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100">
                          "{step.messageContent}"
                        </p>

                        {btnList.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {btnList.map((b: any, bIdx: number) => (
                              <span
                                key={bIdx}
                                className="text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md shadow-2xs"
                              >
                                {b.title || b.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sequence Stats Footer */}
              {seq.stats && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
                  <div className="flex items-center gap-4">
                    <span>Total Enrolled: <strong className="text-slate-800">{seq.stats.totalEnrollments}</strong></span>
                    <span>Currently Active: <strong className="text-amber-600">{seq.stats.activeCount}</strong></span>
                    <span>Replied / Converted: <strong className="text-emerald-600">{seq.stats.repliedCount + seq.stats.convertedCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Conversion &amp; Response Rate: {seq.stats.conversionRate}%</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Create Automated Drip Follow-up Sequence</h3>
                  <p className="text-slate-400 text-xs">Set multi-step delays &amp; variables</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSequence} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sequence Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Catalog Inquiry Follow-up"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Enroll Trigger</label>
                  <select
                    value={formTriggerStatus}
                    onChange={(e) => setFormTriggerStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="INTERESTED">When Lead status is INTERESTED</option>
                    <option value="CONTACTED">When Lead status is CONTACTED</option>
                    <option value="FOLLOW_UP">When Lead status is FOLLOW_UP</option>
                    <option value="NEW">When Lead is newly created (NEW)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Sends reminders 2h, 24h, 72h after catalog inquiry."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500 outline-none text-slate-600"
                />
              </div>

              {/* Dynamic Steps List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Follow-up Sequence Steps ({formSteps.length})
                  </span>
                  {formSteps.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Step
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {formSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          Step {step.stepOrder}
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500">Wait:</label>
                          <select
                            value={step.delayMinutes}
                            onChange={(e) => handleUpdateStep(idx, 'delayMinutes', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value={30}>30 Minutes</option>
                            <option value={60}>1 Hour</option>
                            <option value={120}>2 Hours (Recommended Step 1)</option>
                            <option value={360}>6 Hours</option>
                            <option value={1440}>24 Hours (1 Day)</option>
                            <option value={2880}>48 Hours (2 Days)</option>
                            <option value={4320}>72 Hours (3 Days)</option>
                            <option value={10080}>7 Days</option>
                          </select>

                          {formSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          WhatsApp Message Template Copy:
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={step.messageContent}
                          onChange={(e) => handleUpdateStep(idx, 'messageContent', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <span>Dynamic Tags:</span>
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{'{{customer_name}}'}</span>
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{'{{product_name}}'}</span>
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{'{{business_name}}'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : 'Save & Activate Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
