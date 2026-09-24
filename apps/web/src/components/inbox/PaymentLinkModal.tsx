import React, { useState } from 'react';
import { CreditCard, Send, X, ShoppingBag, Check, QrCode, Sparkles } from 'lucide-react';
import { Product } from '../../types';

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPaymentLink: (data: {
    amount: number;
    description: string;
    items?: any[];
  }) => Promise<void>;
  customerName?: string;
  customerPhone?: string;
  products?: Product[];
  currency?: string;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  isOpen,
  onClose,
  onSendPaymentLink,
  customerName = 'Customer',
  customerPhone = '',
  products = [],
  currency = 'INR',
}) => {
  const [amount, setAmount] = useState<number>(1499);
  const [description, setDescription] = useState('Order Payment & Instant WhatsApp Confirmation');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleProduct = (product: Product) => {
    let updated: Product[];
    if (selectedProducts.find((p) => p.id === product.id)) {
      updated = selectedProducts.filter((p) => p.id !== product.id);
    } else {
      updated = [...selectedProducts, product];
    }
    setSelectedProducts(updated);

    if (updated.length > 0) {
      const sum = updated.reduce((acc, p) => acc + (p.discountPrice || p.price), 0);
      setAmount(sum);
      setDescription(`Order for: ${updated.map((p) => p.name).join(', ')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSendPaymentLink({
        amount,
        description: description.trim(),
        items: selectedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.discountPrice || p.price,
          sku: p.sku,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Send WhatsApp Checkout &amp; Razorpay UPI Link</h3>
              <p className="text-emerald-400/80 text-xs">Direct in-chat order payment with instant receipt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Inputs */}
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-900">Customer: <span className="font-semibold text-emerald-800">{customerName}</span></p>
                <p className="text-slate-600 font-mono text-[11px]">{customerPhone}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Order Description / Items Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 1x Red Anarkali Kurti (Size M)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none resize-none text-slate-800"
                />
              </div>

              {/* Quick Product Selector */}
              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Attach Catalog Product(s) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-1.5 bg-slate-50">
                    {products.map((p) => {
                      const isSelected = selectedProducts.some((sp) => sp.id === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleProduct(p)}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-100/70 border border-emerald-300' : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                          </div>
                          <span className="font-bold text-emerald-700 ml-2">₹{p.discountPrice || p.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Live WhatsApp Checkout Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">
                Live In-Chat Payment Card Preview
              </label>
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-center min-h-[300px]">
                <div className="bg-white rounded-2xl rounded-tr-xs p-4 shadow-md border border-slate-100 max-w-[95%] space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      Payment Request
                    </span>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      PENDING
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-600">👤 {customerName}</p>
                    <p className="text-base font-extrabold text-slate-900">
                      Amount Due: <span className="text-emerald-600">₹{amount.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-slate-500 text-[11px] leading-snug italic">
                      📝 {description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-xl text-center shadow-md flex items-center justify-center gap-2 cursor-pointer">
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{amount.toLocaleString('en-IN')} Now</span>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                      <QrCode className="w-3 h-3" />
                      <span>Supports UPI (GPay/PhonePe/Paytm), Cards &amp; NetBanking</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Generating...' : 'Send WhatsApp Payment Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
