import { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  FileText, 
  ArrowRight,
  LifeBuoy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  type?: 'text' | 'suggestion';
  suggestions?: any[];
}

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Hello! I am your Notify assistant. How can I help you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const queryTerm = input;
    setInput("");
    setIsTyping(true);

    try {
        // --- 🤖 AI BOT LOGIC: Persona-driven Conversations ---
        const lowerInput = queryTerm.toLowerCase();
        
        // 1. Handling Greetings
        if (lowerInput.match(/^(hi|hello|hey|hola|good morning|good evening)/)) {
            setTimeout(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, { 
                    id: Date.now().toString(), 
                    sender: 'bot', 
                    text: "Hi there! 👋 Welcome to Notify Support. I'm here to help you solve your technical issues instantly. What's on your mind? (API issues, WhatsApp connectivity, Billing?)" 
                }]);
            }, 800);
            return;
        }

        // 2. Search & Summarize (GPT Style)
        const res = await api.get(`/knowledge/articles?search=${encodeURIComponent(queryTerm)}`);
        const articles = res.data.articles || [];

        setTimeout(async () => {
            setIsTyping(false);
            if (articles.length > 0) {
                const topArt = articles[0];
                // Fetch full article to speak its content
                try {
                    const detailRes = await api.get(`/knowledge/articles/${topArt.slug}`);
                    const fullContent = detailRes.data.article.content.replace(/<[^>]*>/g, '').substring(0, 300) + '...';
                    
                    setMessages(prev => [...prev, { 
                        id: (Date.now()+1).toString(), 
                        sender: 'bot', 
                        text: `Based on our database for "${queryTerm}", here is what I found: \n\n"${fullContent}"\n\nYou can read the full guide below:`,
                        type: 'suggestion',
                        suggestions: [topArt]
                    }]);
                } catch (e) {
                    setMessages(prev => [...prev, { id: 'err', sender: 'bot', text: "I found something but had trouble summarizing it. Check the link below!" }]);
                }
            } else {
                setMessages(prev => [...prev, { 
                    id: (Date.now()+1).toString(), 
                    sender: 'bot', 
                    text: `I've analyzed your query regarding "${queryTerm}" but I couldn't find a localized solution in our AI records. \n\nShould I connect you to our technical leadership team (Sandeep Yadav) directly?`
                }]);
            }
        }, 1500);

    } catch (e) {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: 'err', sender: 'bot', text: "Sorry, I'm having trouble connecting to the system." }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* 🟢 Launcher Button */}
      {!isOpen && (
        <button 
           onClick={() => setIsOpen(true)}
           className="h-16 w-16 rounded-full shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] bg-primary hover:bg-primary/90 flex items-center justify-center p-0 transition-all hover:scale-105 active:scale-95 relative border-4 border-white dark:border-slate-800"
        >
           <MessageCircle className="h-7 w-7 text-white" />
           <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              ONLINE
           </div>
        </button>
      )}

      {/* 💬 Chat Window */}
      {isOpen && (
        <div className="w-[350px] md:w-[400px] h-[550px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
           
           {/* Header */}
           <div className="p-6 bg-gradient-to-r from-primary to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Bot className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">Notify Assistant</h3>
                    <p className="text-[10px] font-bold text-white/70">Always active for support</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-full">
                 <X className="h-5 w-5" />
              </Button>
           </div>

           {/* Messages */}
           <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 dark:bg-transparent">
              {messages.map(m => (
                <div key={m.id} className={cn("flex flex-col", m.sender === 'user' ? "items-end" : "items-start")}>
                   <div className={cn(
                     "max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm",
                     m.sender === 'user' 
                       ? "bg-primary text-white rounded-tr-none" 
                       : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700"
                   )}>
                      {m.text}
                      
                      {/* 📄 Article Suggestions inside Chat */}
                      {m.type === 'suggestion' && m.suggestions && (
                        <div className="mt-3 space-y-2">
                           {m.suggestions.map((s: any) => (
                             <Link key={s.id} to={`/support/help/${s.slug}`} className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-xs text-primary font-bold flex items-center justify-between">
                                <span className="truncate">{s.title}</span>
                                <ArrowRight className="h-3 w-3" />
                             </Link>
                           ))}
                        </div>
                      )}
                   </div>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest px-1">
                      {m.sender === 'bot' ? 'Notify Bot' : 'You'}
                   </p>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-1 p-2">
                   <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                </div>
              )}
           </div>

           {/* Input Area */}
           <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 py-2 border-b border-slate-50 mb-3">
                 <Link to="/support" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
                    <LifeBuoy className="h-3.5 w-3.5" /> Raise Ticket
                 </Link>
              </div>
              <div className="flex items-center gap-2">
                 <Input 
                   placeholder="Type a message..." 
                   className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-medium"
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                 />
                 <Button size="icon" className="h-12 w-12 rounded-2xl shrink-0" onClick={handleSend}>
                    <Send className="h-5 w-5" />
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
