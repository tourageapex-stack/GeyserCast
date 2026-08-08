import React, { useState } from 'react';
import { Bot, Send, Sparkles, Filter, RefreshCw, User, MessageSquare } from 'lucide-react';
import { FilterState } from '../types';

interface GeminiAssistantProps {
  onApplyNaturalFilter: (updates: Partial<FilterState>, summary: string) => void;
  userLat: number;
  userLon: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ onApplyNaturalFilter, userLat, userLon }) => {
  const [queryInput, setQueryInput] = useState<string>('');
  const [filterInput, setFilterInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your official Yellowstone Geyser AI Assistant. I use live structured GeyserTimes prediction data and park geography to answer questions, explain predictions, and suggest optimal viewing itineraries. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);

  const quickPrompts = [
    'What geysers are likely to erupt next?',
    'What can I see in the next two hours?',
    "I'm at Old Faithful. What should I try to see next?",
    'Which geysers have the highest confidence predictions?',
    'Why is Old Faithful predicted to erupt now?',
  ];

  const handleSendQuery = async (textToSend?: string) => {
    const prompt = textToSend || queryInput;
    if (!prompt.trim() || queryLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQueryInput('');
    setQueryLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userLat, userLon }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.answer || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to Gemini AI Assistant right now. Please verify server connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleParseFilter = async () => {
    if (!filterInput.trim() || filterLoading) return;
    setFilterLoading(true);

    try {
      const res = await fetch('/api/ai/parse-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: filterInput }),
      });
      const parsed = await res.json();

      const updates: Partial<FilterState> = {};
      if (parsed.basin) updates.selectedBasins = [parsed.basin];
      if (parsed.timeWindowMinutes) {
        if (parsed.timeWindowMinutes <= 30) updates.timeWindowRange = '30m';
        else if (parsed.timeWindowMinutes <= 60) updates.timeWindowRange = '1h';
        else if (parsed.timeWindowMinutes <= 120) updates.timeWindowRange = '2h';
        else updates.timeWindowRange = '4h';
      }
      if (parsed.minConfidence) updates.minConfidence = parsed.minConfidence;
      if (parsed.geyserName) updates.searchQuery = parsed.geyserName;

      onApplyNaturalFilter(updates, parsed.summary || `Applied filter from: "${filterInput}"`);
    } catch (err) {
      console.error('[Filter Translation Error]', err);
    } finally {
      setFilterLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Natural Language Filter Translator Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl text-stone-100 space-y-3">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <Filter className="w-4 h-4" />
          <span>Natural Language Database Filter</span>
        </div>
        <p className="text-xs text-stone-400">
          Type requests like <em className="text-stone-300">"Show geysers near Old Faithful likely to erupt in the next hour"</em> to filter the main forecast feed automatically.
        </p>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParseFilter()}
            placeholder="e.g. Show Upper Geyser Basin eruptions in next 2 hours with >70% confidence"
            className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleParseFilter}
            disabled={filterLoading}
            className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition shrink-0"
          >
            {filterLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Apply Filter</span>
          </button>
        </div>
      </div>

      {/* Gemini AI Chat Panel */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl text-stone-100 space-y-4 flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-600 p-2 rounded-xl text-stone-950 font-bold">
              <Bot className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100">Gemini Geyser Assistant</h3>
              <p className="text-[11px] text-stone-400">
                Grounded strictly in real GeyserTimes historical data & numerical predictions
              </p>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendQuery(qp)}
              className="bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-stone-300 text-xs px-3 py-1.5 rounded-full transition whitespace-nowrap shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-stone-950/60 rounded-xl border border-stone-800/80">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="bg-sky-950 border border-sky-600/50 p-1.5 rounded-xl shrink-0">
                  <Bot className="w-4 h-4 text-sky-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                    : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                <div>{msg.content}</div>
                <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-stone-900/70 text-right' : 'text-stone-500'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="bg-amber-600 p-1.5 rounded-xl shrink-0">
                  <User className="w-4 h-4 text-stone-950" />
                </div>
              )}
            </div>
          ))}

          {queryLoading && (
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-medium animate-pulse p-2">
              <Bot className="w-4 h-4" />
              <span>Gemini is analyzing structured geyser database...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder="Ask anything about Yellowstone geyser forecasts..."
            className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => handleSendQuery()}
            disabled={queryLoading}
            className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold p-3 rounded-xl transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
