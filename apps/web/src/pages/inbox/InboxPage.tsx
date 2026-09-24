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
  CreditCard,
  List,
  ExternalLink,
  ChevronDown,
  QrCode,
} from 'lucide-react';
import { InteractiveButtonsModal } from '../../components/inbox/InteractiveButtonsModal';
import { InteractiveListModal } from '../../components/inbox/InteractiveListModal';
import { PaymentLinkModal } from '../../components/inbox/PaymentLinkModal';

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
  const [isButtonsModalOpen, setIsButtonsModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expandedListMessageId, setExpandedListMessageId] = useState<string | null>(null);
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

    socketService.onMessage(handleNewMessage);
    socketService.onConversationUpdated(handleConvUpdated);

    return () => {
      socketService.offMessage();
      socketService.offConversationUpdated();
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

  const handleSendInteractiveButtons = async (payload: {
    header?: string;
    body: string;
    footer?: string;
    buttons: Array<{ id: string; title: string }>;
  }) => {
    if (!selectedConvId) return;
    const res: any = await api.post('/messages/send', {
      conversationId: selectedConvId,
      content: payload.body,
      header: payload.header,
      footer: payload.footer,
      buttons: payload.buttons,
    });

    if (res.data) {
      setMessages((prev) => [...prev, res.data]);
    }
  };

  const handleSendInteractiveList = async (payload: {
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
  }) => {
    if (!selectedConvId) return;
    const res: any = await api.post('/messages/send', {
      conversationId: selectedConvId,
      content: payload.body,
      header: payload.header,
      footer: payload.footer,
      list: payload.list,
    });

    if (res.data) {
      setMessages((prev) => [...prev, res.data]);
    }
  };

  const handleSendPaymentLink = async (payload: {
    amount: number;
    description: string;
    items?: any[];
  }) => {
    if (!selectedConvId) return;
    const leadId = activeConversation?.customer?.leads?.[0]?.id;
    const res: any = await api.post('/payments/in-chat-link', {
      conversationId: selectedConvId,
      amount: payload.amount,
      description: payload.description,
      items: payload.items,
      leadId,
    });

    if (res?.data?.message) {
      setMessages((prev) => [...prev, res.data.message]);
      fetchConversationDetails(selectedConvId);
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
            {['ALL', 'AI_ACTIVE', 'HUMAN_REQUIRED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  filterStatus === st
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Chats' : st === 'AI_ACTIVE' ? '🤖 AI Active' : '👤 Human Queue'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400 text-xs">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No conversations found</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const custAny = conv.customer as any;
              const hasLead = custAny?.leads && custAny.leads.length > 0;
              const leadStatus = hasLead ? custAny.leads[0]?.status : null;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-2.5 ${
                    isSelected ? 'bg-emerald-50/60 border-l-4 border-emerald-500' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {conv.customer?.name ? conv.customer.name.slice(0, 2).toUpperCase() : 'WA'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.customer?.name || conv.customer?.phone || 'Customer'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate mb-1">
                      {conv.lastMessageText || 'No message yet'}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conv.status === 'AI_ACTIVE' ? (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <UserCheck className="w-2.5 h-2.5" /> Human
                        </span>
                      )}

                      {leadStatus && (
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                          {leadStatus}
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

      {/* 2. Middle: Active Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {activeConversation.customer?.name ? activeConversation.customer.name.slice(0, 2).toUpperCase() : 'WA'}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    {activeConversation.customer?.name}
                    <span className="text-slate-400 text-xs font-normal">({activeConversation.customer?.phone})</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last active: {new Date(activeConversation.lastMessageAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Generate Razorpay / UPI Link"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Send Payment Link</span>
                </button>

                <button
                  onClick={toggleHumanHandoff}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                    activeConversation.status === 'HUMAN_REQUIRED'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {activeConversation.status === 'HUMAN_REQUIRED' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Human (Resume AI)</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AI (Take Over)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#EFEAE2]">
              {messages.map((m) => {
                const isOutbound = m.direction === 'OUTBOUND';
                let parsedMetadata: any = null;
                try {
                  parsedMetadata = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
                } catch {
                  parsedMetadata = null;
                }

                const isPaymentCard = parsedMetadata?.type === 'PAYMENT_LINK';
                const isButtonsCard = parsedMetadata?.interactiveType === 'BUTTONS' || (parsedMetadata?.buttons && parsedMetadata.buttons.length > 0);
                const isListCard = parsedMetadata?.interactiveType === 'LIST' || !!parsedMetadata?.list;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed ${
                        isOutbound
                          ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs'
                          : 'bg-white text-slate-900 rounded-tl-xs border border-slate-100'
                      }`}
                    >
                      {/* Media image if attached */}
                      {m.mediaUrl && (
                        <img
                          src={m.mediaUrl}
                          alt="Product"
                          className="w-full h-44 object-cover rounded-xl mb-2 shadow-xs"
                        />
                      )}

                      {/* Header if present in metadata */}
                      {parsedMetadata?.header && (
                        <p className="font-extrabold text-xs text-slate-900 border-b border-black/10 pb-1 mb-1.5">
                          {parsedMetadata.header}
                        </p>
                      )}

                      {/* 1. Payment Link Card Bubble */}
                      {isPaymentCard ? (
                        <div className="space-y-2 py-1">
                          <div className="flex items-center justify-between border-b border-emerald-900/10 pb-1.5">
                            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                              Order #{parsedMetadata.orderNumber || 'Checkout'}
                            </span>
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              {parsedMetadata.status || 'PENDING'}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap text-slate-800 text-xs">
                            {m.content}
                          </p>

                          {parsedMetadata.paymentUrl && (
                            <div className="pt-2">
                              <a
                                href={parsedMetadata.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay ₹{parsedMetadata.amount?.toLocaleString('en-IN')} via Razorpay / UPI</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : isButtonsCard ? (
                        /* 2. Interactive Buttons Bubble */
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {parsedMetadata?.footer && (
                            <p className="text-[10px] text-slate-500 italic border-t border-black/5 pt-1">
                              {parsedMetadata.footer}
                            </p>
                          )}
                          <div className="pt-1 space-y-1.5">
                            {(parsedMetadata.buttons || []).map((btn: any, bIdx: number) => (
                              <div
                                key={bIdx}
                                className="w-full bg-white/90 hover:bg-white border border-emerald-500/30 rounded-xl py-1.5 px-3 text-center text-xs font-bold text-emerald-700 shadow-2xs cursor-pointer transition-colors"
                              >
                                {btn.title || btn.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isListCard ? (
                        /* 3. Interactive List Menu Bubble */
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {parsedMetadata?.footer && (
                            <p className="text-[10px] text-slate-500 italic border-t border-black/5 pt-1">
                              {parsedMetadata.footer}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedListMessageId(expandedListMessageId === m.id ? null : m.id)}
                            className="w-full mt-2 py-1.5 px-3 bg-white/90 hover:bg-white border border-teal-500/30 rounded-xl text-center text-xs font-bold text-teal-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <List className="w-3.5 h-3.5" />
                            <span>{parsedMetadata.list?.buttonText || 'View Options'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedListMessageId === m.id ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedListMessageId === m.id && parsedMetadata.list?.sections && (
                            <div className="mt-2 bg-white rounded-xl shadow-md border border-slate-200 p-2.5 space-y-2 animate-in fade-in duration-150">
                              {parsedMetadata.list.sections.map((sec: any, sIdx: number) => (
                                <div key={sIdx} className="space-y-1">
                                  <p className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                    {sec.title}
                                  </p>
                                  {sec.rows?.map((r: any, rIdx: number) => (
                                    <div key={rIdx} className="p-1 rounded-md border border-slate-100 hover:bg-slate-50 text-left">
                                      <p className="font-bold text-slate-800 text-[11px]">{r.title}</p>
                                      {r.description && (
                                        <p className="text-[10px] text-slate-500">{r.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Standard Text Bubble */
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}

                      {/* Timestamp & Read Receipts */}
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

            {/* Input & Action Bar */}
            <div className="p-2.5 bg-white border-t border-slate-200 flex flex-col gap-2">
              {/* Quick Actions Ribbon */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsButtonsModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Interactive Buttons</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsListModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  <List className="w-3 h-3" />
                  <span>List Menu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Send Payment Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors shrink-0"
                >
                  <ShoppingBag className="w-3 h-3 text-emerald-600" />
                  <span>Catalog</span>
                </button>
              </div>

              {/* Chat Input Field */}
              <div className="flex items-center gap-2">
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

          {/* Quick Payment Action Button */}
          <div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Create Payment Link</span>
            </button>
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

      {/* Modals */}
      <InteractiveButtonsModal
        isOpen={isButtonsModalOpen}
        onClose={() => setIsButtonsModalOpen(false)}
        onSend={handleSendInteractiveButtons}
        customerName={activeConversation?.customer?.name}
      />

      <InteractiveListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onSend={handleSendInteractiveList}
        customerName={activeConversation?.customer?.name}
      />

      <PaymentLinkModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSendPaymentLink={handleSendPaymentLink}
        customerName={activeConversation?.customer?.name}
        customerPhone={activeConversation?.customer?.phone}
        products={products}
        currency={currency}
      />
    </div>
  );
};
