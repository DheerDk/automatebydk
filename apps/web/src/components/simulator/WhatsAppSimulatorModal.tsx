import React, { useState } from 'react';
import { api } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, Bot, Sparkles, User, RefreshCw, ShoppingBag, PhoneCall, HelpCircle } from 'lucide-react';

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SimMessage {
  id: string;
  sender: 'customer' | 'bot';
  text: string;
  time: string;
  mediaUrl?: string;
  productsFound?: number;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { currentOrganization } = useAuth();
  const { settings } = useTenant();

  const [customerPhone, setCustomerPhone] = useState('+919876543210');
  const [customerName, setCustomerName] = useState('Rahul Verma');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: 'init_1',
      sender: 'bot',
      text: settings?.welcomeMessage || `👋 Welcome to ${currentOrganization?.name || 'our store'}!\n\n1️⃣ Browse Trending Products\n2️⃣ Search a Product\n3️⃣ Offers & Deals\n4️⃣ Talk to Support`,
      time: 'Just now',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: SimMessage = {
      id: `sim_u_${Date.now()}`,
      sender: 'customer',
      text,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res: any = await api.post('/webhooks/simulate', {
        organizationId: currentOrganization?.id,
        phone: customerPhone,
        name: customerName,
        text,
      });

      const responseData = res.data || res;
      const outgoing = responseData.outgoingResponse || responseData;
      const replyContent = outgoing?.content || outgoing?.text || responseData.replyText || 'Thank you for reaching out!';

      const botMsg: SimMessage = {
        id: `sim_b_${Date.now()}`,
        sender: 'bot',
        text: replyContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaUrl: outgoing?.mediaUrl,
        productsFound: responseData.productsFound,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: SimMessage = {
        id: `sim_err_${Date.now()}`,
        sender: 'bot',
        text: `⚠️ Simulation error: ${err.message}`,
        time: timeStr,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Black Shirts < 1500', prompt: 'Show me black shirts under 1500' },
    { label: 'Red Kurti in M', prompt: 'Do you have red anarkali kurti in M size?' },
    { label: 'Store Timings?', prompt: 'What are your store hours and return policy?' },
    { label: 'Sneakers < 2000', prompt: 'Show me white sneakers under 2000' },
    { label: 'Human Support', prompt: 'I want to talk to human support' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row h-[600px] animate-in zoom-in-95">
        {/* Left: Test Controls & Quick Actions */}
        <div className="w-full md:w-64 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">WhatsApp Simulator</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Test natural language AI catalog search, FAQ resolution, and lead capture live.
            </p>

            <div className="space-y-2 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Quick Test Prompts
              </span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="w-full text-left bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 transition-colors truncate"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setMessages([])}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 pt-3 border-t border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Right: Simulated WhatsApp Mobile Phone UI */}
        <div className="flex-1 flex flex-col bg-[#EFEAE2] relative">
          {/* WhatsApp Header */}
          <div className="h-14 bg-[#075E54] text-white px-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                {currentOrganization?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{currentOrganization?.name || 'StyleHub Store'}</p>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AI Business Assistant • online</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 whatsapp-chat-bg">
            {messages.map((m) => {
              const isUser = m.sender === 'customer';

              // Extract clickable option buttons from bot messages (1️⃣, 2️⃣, or numbered lines or action prompts)
              const options: { label: string; value: string }[] = [];
              if (!isUser && m.text) {
                const lines = m.text.split('\n');
                for (const line of lines) {
                  const trimmed = line.trim();
                  // Match 1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣, 6️⃣, 7️⃣, 8️⃣ or 1., 2. etc
                  const match = trimmed.match(/^([0-9]|10|[0-9]️⃣|🔟|[0-9]\))\s*[:.-]?\s*(.+)/);
                  if (match) {
                    const num = match[1].replace('️⃣', '').replace(')', '').trim();
                    options.push({ label: trimmed, value: num });
                  }
                }

                // If message offers to buy
                if (m.text.toLowerCase().includes('reply with *"buy"') || m.text.toLowerCase().includes('reply with "buy"')) {
                  options.push({ label: '🛒 Buy / Order This Item', value: 'I want to buy this product' });
                  options.push({ label: '❓ Ask Question about Size/Stock', value: 'Do you have other sizes or colors?' });
                }

                // If message offers menu
                if (m.text.toLowerCase().includes('reply *"menu"') || m.text.toLowerCase().includes('reply "menu"')) {
                  options.push({ label: '📋 Main Menu', value: 'menu' });
                }
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 shadow-xs text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                    }`}
                  >
                    {m.mediaUrl && (
                      <img
                        src={m.mediaUrl}
                        alt="Product preview"
                        className="w-full h-36 object-cover rounded-xl mb-2.5 shadow-xs"
                      />
                    )}
                    <p>{m.text}</p>

                    {/* Interactive Clickable WhatsApp Option Buttons */}
                    {options.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          👉 Tap an option below:
                        </span>
                        {options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSendMessage(opt.value)}
                            disabled={isLoading}
                            className="w-full bg-[#E7F8F5] hover:bg-[#D1F2EB] active:bg-[#B2EBDD] text-[#075E54] border border-[#A2E2D6] rounded-xl py-2 px-3 text-xs font-bold text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                          >
                            <span className="truncate pr-2">{opt.label}</span>
                            <span className="text-[10px] bg-white text-[#075E54] px-2 py-0.5 rounded-lg font-black shadow-2xs group-hover:bg-[#075E54] group-hover:text-white transition-colors shrink-0">
                              Tap ➔
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 block text-right mt-1.5 font-medium">
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 text-xs text-slate-500 shadow-xs max-w-[140px]">
                <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>AI typing...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type message (e.g. Show me black shirts < 1500)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center hover:bg-[#075E54] disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
