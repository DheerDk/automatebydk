import React, { useState } from 'react';
import { Sparkles, Send, Plus, Trash2, X, MessageSquare } from 'lucide-react';

interface InteractiveButtonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: { header?: string; body: string; footer?: string; buttons: Array<{ id: string; title: string }> }) => Promise<void>;
  customerName?: string;
}

export const InteractiveButtonsModal: React.FC<InteractiveButtonsModalProps> = ({
  isOpen,
  onClose,
  onSend,
  customerName = 'Customer',
}) => {
  const [header, setHeader] = useState('');
  const [body, setBody] = useState(`Hi ${customerName}! How can we assist you today? Please choose an option below:`);
  const [footer, setFooter] = useState('AutoMate Instant Assistant');
  const [buttons, setButtons] = useState<Array<{ id: string; title: string }>>([
    { id: 'btn_browse_catalog', title: '🛍️ View Catalog' },
    { id: 'btn_talk_human', title: '💬 Chat with Staff' },
    { id: 'btn_offers', title: '🏷️ Today Deals' },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { id: `btn_${Date.now()}`, title: `Option ${buttons.length + 1}` }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleUpdateButton = (index: number, title: string) => {
    const updated = [...buttons];
    updated[index].title = title.slice(0, 20); // WhatsApp limit: 20 chars
    setButtons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Body message is required.');
      return;
    }
    if (buttons.length === 0) {
      setError('Please add at least 1 button.');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await onSend({
        header: header.trim() || undefined,
        body: body.trim(),
        footer: footer.trim() || undefined,
        buttons: buttons.map((b, i) => ({
          id: b.id || `btn_${i + 1}`,
          title: b.title.trim() || `Option ${i + 1}`,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send interactive buttons');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Create WhatsApp Interactive Quick Buttons</h3>
              <p className="text-slate-400 text-xs">Send up to 3 clickable quick-reply action buttons</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header Text <span className="text-slate-400 font-normal">(Optional, max 60 chars)</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Summer Collection 2026"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Type your WhatsApp message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Footer Text <span className="text-slate-400 font-normal">(Optional, max 60 chars)</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Reply with an option or type STOP"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Action Buttons <span className="text-slate-400 font-normal">({buttons.length}/3)</span>
                  </label>
                  {buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddButton}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Button
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        maxLength={20}
                        required
                        placeholder="Button Title (max 20 chars)"
                        value={btn.title}
                        onChange={(e) => handleUpdateButton(idx, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:border-emerald-500 outline-none font-semibold text-slate-800"
                      />
                      {buttons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live WhatsApp Preview Column */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">
                Live WhatsApp Bubble Preview
              </label>
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-end min-h-[260px]">
                <div className="bg-white rounded-2xl rounded-tr-xs p-3 shadow-xs border border-slate-100 max-w-[90%] self-start space-y-2">
                  {header && (
                    <p className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-1">
                      {header}
                    </p>
                  )}
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {body || 'Type your message on the left...'}
                  </p>
                  {footer && (
                    <p className="text-[10px] text-slate-400 italic">
                      {footer}
                    </p>
                  )}
                </div>

                {/* Buttons Preview */}
                <div className="mt-2 space-y-1.5 max-w-[90%] self-start w-full">
                  {buttons.map((b, i) => (
                    <div
                      key={i}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-center text-xs font-bold text-emerald-600 shadow-2xs cursor-pointer transition-colors"
                    >
                      {b.title || `Button ${i + 1}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !body.trim()}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Sending...' : 'Send Interactive Buttons'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
