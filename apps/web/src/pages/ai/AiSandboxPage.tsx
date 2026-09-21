import React, { useState } from 'react';
import { api } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import { Bot, Sparkles, Search, CheckCircle2, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';

export const AiSandboxPage: React.FC = () => {
  const { currency } = useTenant();
  const [searchQuery, setSearchQuery] = useState('Show me black shirts under 1500');
  const [faqQuestion, setFaqQuestion] = useState('What are your store hours and return policy?');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [faqResult, setFaqResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFaqLoading, setIsFaqLoading] = useState(false);

  const handleTestSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res: any = await api.post('/ai/test-search', { query: searchQuery });
      if (res.data) setSearchResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Error running AI search test');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTestFaq = async () => {
    if (!faqQuestion.trim()) return;
    setIsFaqLoading(true);
    try {
      const res: any = await api.post('/ai/test-faq', { question: faqQuestion });
      if (res.data) setFaqResult(res.data);
    } catch (err: any) {
      alert(err.message || 'Error running FAQ test');
    } finally {
      setIsFaqLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Engine Sandbox</h1>
        <p className="text-xs text-slate-500 mt-0.5">Test natural language product extraction and zero-hallucination catalog queries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Natural Language Product Search Tester */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Natural Language Catalog Search</h3>
              <p className="text-xs text-slate-400">Extracts filters & retrieves real database items</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Do you have red kurti under 2000?"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleTestSearch}
              disabled={isSearching}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-xs"
            >
              {isSearching ? 'Processing...' : 'Run Query'}
            </button>
          </div>

          {searchResult && (
            <div className="space-y-3 pt-2">
              {/* Extracted Structured Filters */}
              <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>AI Extracted Structured Filters:</span>
                </div>
                <pre className="text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(searchResult.extractedFilters, null, 2)}
                </pre>
              </div>

              {/* Database Results */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Database Products Returned ({searchResult.productsCount})</span>
                  <span className="text-emerald-600 font-semibold text-[10px]">Zero Hallucination Guarantee</span>
                </div>
                <div className="space-y-2">
                  {searchResult.products.map((p: any) => (
                    <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} alt={p.name} className="w-10 h-10 object-cover rounded" />
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <span className="text-[10px] text-slate-500">Color: {p.color} • Size: {p.size || 'Free'}</span>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">{currency} {p.discountPrice || p.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Business FAQ Prompt Resolver */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500 text-white">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Store Policy & FAQ Assistant</h3>
              <p className="text-xs text-slate-400">Answers using your isolated business settings</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={faqQuestion}
              onChange={(e) => setFaqQuestion(e.target.value)}
              placeholder="e.g. What is your return policy?"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleTestFaq}
              disabled={isFaqLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs"
            >
              {isFaqLoading ? 'Generating...' : 'Ask FAQ'}
            </button>
          </div>

          {faqResult && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Generated WhatsApp Response:
              </span>
              <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {faqResult.answer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
