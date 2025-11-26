import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AIConsultant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Xin chào! Tôi là Trợ lý ảo AI của Hoàng Phúc Glass. Bạn đang cần tư vấn về loại kính nào? (Ví dụ: Kính ốp bếp, cầu thang, hay vách ngăn...)',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare history for context
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    
    // Call Gemini API
    const responseText = await sendMessageToGemini(userText, history);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } bg-gradient-to-tr from-sky-500 to-blue-600 text-white`}
      >
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
        <MessageCircle size={32} />
      </button>

      {/* Chat Interface Modal */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-4 flex justify-between items-center text-white">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-3">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Trợ Lý Hoàng Phúc</h3>
              <div className="flex items-center text-xs text-blue-100">
                <Sparkles size={12} className="mr-1" />
                <span className="uppercase tracking-wide font-semibold">AI Powered</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-sky-500 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin text-sky-500" />
                <span className="text-xs text-slate-500 font-medium">AI đang soạn câu trả lời...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-2 border border-slate-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Hỏi về kính cường lực, giá cả..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 placeholder:text-slate-400 outline-none py-2"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="ml-2 p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 disabled:opacity-50 disabled:hover:bg-sky-500 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            AI có thể đưa ra thông tin tham khảo. Vui lòng liên hệ hotline để chốt đơn hàng.
          </p>
        </div>
      </div>
    </>
  );
};