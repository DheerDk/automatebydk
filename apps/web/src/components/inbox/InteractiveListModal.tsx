import React, { useState } from 'react';
import { List, Send, Plus, Trash2, X, ChevronDown, Sparkles } from 'lucide-react';

interface InteractiveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: {
    header?: string;
    body: string;
    footer?: string;
    list: {
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
  }) => Promise<void>;
  customerName?: string;
}

export const InteractiveListModal: React.FC<InteractiveListModalProps> = ({
  isOpen,
  onClose,
  onSend,
  customerName = 'Customer',
}) => {
  const [header, setHeader] = useState('Featured Store Menu');
  const [body, setBody] = useState(`Hi ${customerName}! Explore our top categories and bestselling options below:`);
  const [footer, setFooter] = useState('AutoMate 24/7 Catalog');
  const [buttonText, setButtonText] = useState('View Menu Options');
  const [sections, setSections] = useState<
    Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
  >([
    {
      title: '👗 Ethnic & Festive',
      rows: [
        { id: 'cat_kurti', title: 'Designer Kurtis', description: 'Starting from ₹899' },
        { id: 'cat_saree', title: 'Silk & Georgette Sarees', description: 'Top rated party wear' },
      ],
    },
    {
      title: '👕 Casual & Daily Wear',
      rows: [
        { id: 'cat_shirts', title: 'Pure Cotton Shirts', description: 'Slim fit & breathable' },
        { id: 'cat_jeans', title: 'Denim Jeans & Trousers', description: 'Stretchable comfort fit' },
      ],
    },
  ]);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalRows = sections.reduce((acc, sec) => acc + sec.rows.length, 0);

  const handleAddSection = () => {
    if (sections.length >= 5) return;
    setSections([
      ...sections,
      {
        title: `Section ${sections.length + 1}`,
        rows: [{ id: `item_${Date.now()}`, title: `New Item`, description: '' }],
      },
    ]);
  };

  const handleRemoveSection = (sIdx: number) => {
    setSections(sections.filter((_, i) => i !== sIdx));
  };

  const handleAddRow = (sIdx: number) => {
    if (totalRows >= 10) return;
    const updated = [...sections];
    updated[sIdx].rows.push({
      id: `item_${Date.now()}`,
      title: `Item ${updated[sIdx].rows.length + 1}`,
      description: '',
    });
    setSections(updated);
  };

  const handleRemoveRow = (sIdx: number, rIdx: number) => {
    const updated = [...sections];
    updated[sIdx].rows = updated[sIdx].rows.filter((_, i) => i !== rIdx);
    setSections(updated);
  };

  const handleUpdateSectionTitle = (sIdx: number, title: string) => {
    const updated = [...sections];
    updated[sIdx].title = title.slice(0, 24);
    setSections(updated);
  };

  const handleUpdateRow = (sIdx: number, rIdx: number, field: 'title' | 'description', val: string) => {
    const updated = [...sections];
    if (field === 'title') {
      updated[sIdx].rows[rIdx].title = val.slice(0, 24);
    } else {
      updated[sIdx].rows[rIdx].description = val.slice(0, 72);
    }
    setSections(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Body text is required.');
      return;
    }
    if (totalRows === 0) {
      setError('Please add at least 1 menu item.');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await onSend({
        header: header.trim() || undefined,
        body: body.trim(),
        footer: footer.trim() || undefined,
        list: {
          buttonText: buttonText.trim() || 'View Options',
          sections,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send interactive list');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <List className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Create WhatsApp Interactive List Menu</h3>
              <p className="text-slate-400 text-xs">Organize up to 10 choices in structured sections</p>
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
            {/* Left: Input Configurations */}
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Header <span className="text-slate-400 font-normal">(Optional, max 60 chars)</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Daily Fresh Specials"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Introductory text..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:border-teal-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Action Button Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    required
                    placeholder="e.g. View Options"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:border-teal-500 outline-none font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Footer Text
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. Instant Catalog"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Sections & Rows Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Menu Sections &amp; Items <span className="text-slate-400 font-normal">({totalRows}/10 items)</span>
                  </label>
                  {sections.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Section
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {sections.map((sec, sIdx) => (
                    <div key={sIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          maxLength={24}
                          placeholder="Section Title"
                          value={sec.title}
                          onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 flex-1 outline-none focus:border-teal-500"
                        />
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sIdx)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Items in section */}
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                        {sec.rows.map((row, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={24}
                              placeholder="Item Name (max 24 chars)"
                              value={row.title}
                              onChange={(e) => handleUpdateRow(sIdx, rIdx, 'title', e.target.value)}
                              className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                            />
                            <input
                              type="text"
                              maxLength={72}
                              placeholder="Description (optional)"
                              value={row.description || ''}
                              onChange={(e) => handleUpdateRow(sIdx, rIdx, 'description', e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 outline-none focus:border-teal-500"
                            />
                            {sec.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(sIdx, rIdx)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {totalRows < 10 && (
                          <button
                            type="button"
                            onClick={() => handleAddRow(sIdx)}
                            className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Item
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Interactive List Simulation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">
                Live WhatsApp List View Simulation
              </label>
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col min-h-[340px]">
                <div className="bg-white rounded-2xl rounded-tr-xs p-3 shadow-xs border border-slate-100 max-w-[95%] space-y-2">
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

                  {/* WhatsApp Menu Trigger */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center text-xs font-bold text-teal-600 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>{buttonText || 'View Options'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPreviewExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Simulated Expandable Drawer Menu */}
                {isPreviewExpanded && (
                  <div className="mt-3 bg-white rounded-xl shadow-lg border border-slate-200 p-3 max-w-[95%] space-y-3 animate-in fade-in duration-200 max-h-56 overflow-y-auto">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {buttonText || 'Menu Options'}
                    </div>
                    {sections.map((sec, sIdx) => (
                      <div key={sIdx} className="space-y-1">
                        <p className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {sec.title}
                        </p>
                        {sec.rows.map((row, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 cursor-pointer"
                          >
                            <p className="text-xs font-bold text-slate-800">{row.title}</p>
                            {row.description && (
                              <p className="text-[10px] text-slate-500">{row.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
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
              disabled={isSending || !body.trim() || totalRows === 0}
              className="px-5 py-2 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Sending...' : 'Send Interactive List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
