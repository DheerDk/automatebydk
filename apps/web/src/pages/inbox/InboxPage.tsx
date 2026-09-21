import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useTenant } from '../../contexts/TenantContext';
import { Conversation, Message, Product } from '../../types';
import {
  Search,
  Send,
  Bot,
  UserCheck,
  CheckCheck,
  Check,
  Package,
  Sparkles,
  Tag,
  Phone,
  Mail,
  User,
  ShoppingBag,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const LEAD_STATUS_OPTIONS = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'NEGOTIATION',
  'CONVERTED',
  'LOST',
];

export const InboxPage: React.FC = () => {
  const { currency } = useTenant();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      let url = '/conversations';
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) url += `?${params.toString()}`;

      const res: any = await api.get(url);
      if (res.data) {
        setConversations(res.data);
        if (!selectedConvId && res.data.length > 0) {
          setSelectedConvId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversationDetails = async (id: string) => {
    try {
      const res: any = await api.get(`/conversations/${id}`);
      if (res.data) {
        setActiveConversation(res.data);
        setMessages(res.data.messages || []);
        socketService.joinConversation(id);
      }
    } catch (err) {
      console.error('Error fetching conversation details:', err);
    }
  };

  const fetchProductsForPicker = async () => {
    try {
      const res: any = await api.get('/products?limit=20');
      if (res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchProductsForPicker();
  }, [filterStatus]);

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetails(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === selectedConvId) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchConversations();
    };

    const handleConvUpdated = () => {
      fetchConversations();
      if (selectedConvId) fetchConversationDetails(selectedConvId);
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('conversation:updated', handleConvUpdated);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('conversation:updated', handleConvUpdated);
    };
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customContent?: string, productId?: string) => {
    const content = customContent || inputText;
    if (!content.trim() || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      const res: any = await api.post('/messages/send', {
        conversationId: selectedConvId,
        content,
        productId,
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        setInputText('');
        setIsProductPickerOpen(false);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const toggleHumanHandoff = async () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === 'HUMAN_REQUIRED' ? 'AI_ACTIVE' : 'HUMAN_REQUIRED';
    try {
      await api.put(`/conversations/${activeConversation.id}/status`, {
        status: newStatus,
      });
      fetchConversationDetails(activeConversation.id);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleLeadStatusChange = async (leadId: string, status: string) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status });
      fetchConversationDetails(selectedConvId!);
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 1. Left: Conversation List Panel */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        <div className="p-3 border-b border-slate-200">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-semibold">
            {['ALL', 'AI_ACTIVE', 'HUMAN_REQUIRED', 'RESOLVED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'AI_ACTIVE' ? '🤖 AI' : status === 'HUMAN_REQUIRED' ? '🧑‍💼 Needs Help' : '✅ Done'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No conversations found</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const isHumanReq = conv.status === 'HUMAN_REQUIRED';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-sm">
                    {conv.customer?.name?.charAt(0) || 'C'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {conv.customer?.name || 'Customer'}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.lastMessageText || 'New conversation'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      {isHumanReq ? (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Staff Needed
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          AI Active
                        </span>
                      )}

                      {conv.unreadCount > 0 && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle: WhatsApp Chat Conversation Panel */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2] min-w-0 relative">
        {activeConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {activeConversation.customer?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight">
                    {activeConversation.customer?.name || 'Customer'}
                  </h3>
                  <p className="text-[10px] text-slate-500">{activeConversation.customer?.phone}</p>
                </div>
              </div>

              {/* Status Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleHumanHandoff}
                  className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                    activeConversation.status === 'HUMAN_REQUIRED'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {activeConversation.status === 'HUMAN_REQUIRED' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Human Assigned (Click to resume AI)</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI Active (Click to take over)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 whatsapp-chat-bg">
              {messages.map((m) => {
                const isOutbound = m.direction === 'OUTBOUND';

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-xl p-3 shadow-xs text-xs leading-relaxed whitespace-pre-wrap ${
                        isOutbound
                          ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                      }`}
                    >
                      {m.mediaUrl && (
                        <img
                          src={m.mediaUrl}
                          alt="Product"
                          className="w-full h-40 object-cover rounded-lg mb-2 shadow-xs"
                        />
                      )}
                      <p>{m.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOutbound && (
                          m.status === 'READ' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          ) : m.status === 'DELIVERED' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Product Quick Picker Modal / Dropdown */}
            {isProductPickerOpen && (
              <div className="absolute bottom-16 left-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-30 max-h-64 overflow-y-auto animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Select Catalog Product to Send</span>
                  <button onClick={() => setIsProductPickerOpen(false)} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSendMessage(`🛍️ *${p.name}*\n💰 Price: ${currency} ${p.price}\n👉 Reply BUY to place order!`, p.id)}
                      className="text-left p-2 rounded-lg border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 text-xs flex items-center gap-2 transition-colors"
                    >
                      <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} alt={p.name} className="w-10 h-10 object-cover rounded" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-emerald-600 font-bold">{currency} {p.discountPrice || p.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <button
                onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                title="Attach Product Card"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
              </button>

              <input
                type="text"
                placeholder="Type WhatsApp reply or press Enter..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center disabled:opacity-40 transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* 3. Right: Customer CRM & Lead Status Panel */}
      {activeConversation && activeConversation.customer && (
        <div className="hidden lg:flex w-72 border-l border-slate-200 p-4 flex-col bg-slate-50/50 space-y-4 overflow-y-auto">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Customer Profile</span>
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs text-xs space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">{activeConversation.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeConversation.customer.phone}</span>
              </div>
              {activeConversation.customer.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{activeConversation.customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lead Stage Selector */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Lead Pipeline Stage</span>
            {activeConversation.customer.leads && activeConversation.customer.leads[0] ? (
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Interest: <span className="font-bold text-slate-900">{activeConversation.customer.leads[0].product?.name || 'General Product Enquiry'}</span>
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Value:</span>
                  <span className="font-bold text-emerald-600">
                    {currency} {activeConversation.customer.leads[0].estimatedValue?.toLocaleString() || '1,499'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Update Status</label>
                  <select
                    value={activeConversation.customer.leads[0].status}
                    onChange={(e) => handleLeadStatusChange(activeConversation.customer.leads[0].id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {LEAD_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-center text-xs text-slate-400">
                No active lead for this contact.
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Customer Tags</span>
            <div className="flex flex-wrap gap-1">
              {(activeConversation.customer.tags || []).map((t: string, idx: number) => (
                <span key={idx} className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
