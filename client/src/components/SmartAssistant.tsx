import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bot, Bell, X, Smile, AlertTriangle, Send, Loader2, User } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { database } from '@/lib/firebase';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { useToast } from '@/hooks/use-toast';

// --- IMPORTANT: API Key Management ---
// Storing API keys directly in frontend code is insecure.
// Ideally, use a backend proxy to handle API calls.
// For demonstration, we use a placeholder. Replace with your actual key or use environment variables.
const GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // <<< REPLACE WITH YOUR KEY or use process.env.REACT_APP_GEMINI_API_KEY

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const SmartAssistant = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  // Fetch initial data from Firebase
  useEffect(() => {
    const reportRef = ref(database, 'report_data');
    const productsRef = ref(database, 'products');
    const notificationsRef = ref(database, 'notifications');

    onValue(reportRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        const all = Object.values(data);
        const latest = all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        setReport(latest);
      }
    });
    onValue(productsRef, snapshot => {
      const data = snapshot.val();
      if (data) setProducts(Object.values(data));
    });
    onValue(notificationsRef, snapshot => {
      const data = snapshot.val();
      if (data) setNotifications(Object.values(data));
    });
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatHistory]);

  // Smart calculations
  const lowStock = products.filter((p: any) => p.stock <= 2);
  const unsold = products.filter((p: any) => p.stock >= 5);
  const bestProduct = [...products].sort((a, b) => a.stock - b.stock)[0];
  const hasUnread = notifications.some((n: any) => !n.isRead);

  // Function to send message to Gemini API
  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isLoading) return;
    if (GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
        toast({
            title: t('api_key_missing'),
            description: t('please_add_gemini_api_key'),
            variant: 'destructive',
        });
        return;
    }

    const userMessage: Message = { sender: 'user', text: userInput };
    setChatHistory(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Construct context from current data
      let context = t('assistant_context_intro') + '\n';
      if (report) {
        context += t('latest_report_context', { sales: report.sales, orders: report.orders, profit: report.profit }) + '\n';
      }
      if (bestProduct) {
        context += t('top_seller_context', { name: bestProduct.name }) + '\n';
      }
      if (lowStock.length > 0) {
        context += t('low_stock_context', { count: lowStock.length, names: lowStock.map(p => p.name).join(', ') }) + '\n';
      }
      context += t('user_question_prompt');

      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [
          // Provide previous chat history if needed, mapping to Gemini format
          // { role: "user", parts: [{ text: "Previous user message" }] },
          // { role: "model", parts: [{ text: "Previous AI response" }] },
        ],
      });

      const result = await chat.sendMessage(context + userMessage.text);
      const response = result.response;
      const aiMessage: Message = { sender: 'ai', text: response.text() }; 
      setChatHistory(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage: Message = { sender: 'ai', text: t('error_contacting_ai') };
      setChatHistory(prev => [...prev, errorMessage]);
      toast({
        title: t('error'),
        description: t('error_calling_gemini_api'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, report, products, lowStock, bestProduct, t, toast, model, generationConfig, safetySettings]);

  // Handle Enter key press in input
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent default form submission or newline
      handleSendMessage();
    }
  };

  // Initial message from AI when opened
  useEffect(() => {
    if (open && chatHistory.length === 0) {
        let initialGreeting = `👋 ${t('good_morning')}! ${t('here_is_today_report')}\n`;
        if (report) {
            initialGreeting += `📊 ${t('sales')}: ${report.sales}, ${t('orders')}: ${report.orders}, ${t('profit')}: ${report.profit}\n`;
        }
        if (bestProduct) {
            initialGreeting += `🔥 ${t('top_seller')}: **${bestProduct.name}**\n`;
        }
        if (lowStock.length > 0) {
            initialGreeting += `⚠️ ${t('low_stock_alert', { count: lowStock.length })}\n`;
        }
        initialGreeting += `💬 ${t('you_can_ask_me')}`; 

        setChatHistory([{ sender: 'ai', text: initialGreeting }]);
    }
  }, [open, report, bestProduct, lowStock, t]); // Removed chatHistory dependency to prevent re-triggering

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-6 z-50 no-print">
        <motion.button
          onClick={() => setOpen(prev => !prev)} // Toggle open state
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative bg-primary p-4 rounded-full text-primary-foreground shadow-lg transition-transform duration-200 ease-in-out"
          aria-label={t('toggle_smart_assistant')}
        >
          <Bot className="w-6 h-6" />
          {hasUnread && !open && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Assistant Widget */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-6 w-[350px] h-[500px] bg-card border rounded-xl shadow-xl flex flex-col z-50 overflow-hidden no-print"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b bg-muted/50 flex-shrink-0">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Smile className="w-5 h-5 text-yellow-500" /> {t('smart_assistant')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-grow p-3" ref={scrollAreaRef}>
              <div className="space-y-4">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[85%]`}>
                      {msg.sender === 'ai' && <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
                      <div 
                        className={`rounded-lg px-3 py-2 text-sm ${ 
                          msg.sender === 'user' 
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                        // Basic markdown rendering (bold)
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}
                      />
                      {msg.sender === 'user' && <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                     <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>{t('thinking')}...</span>
                     </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 border-t bg-muted/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Input 
                  type="text"
                  placeholder={t('ask_anything') + '...'}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-grow bg-background"
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  disabled={isLoading || !userInput.trim()}
                  className="h-9 w-9"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              {GEMINI_API_KEY === "YOUR_API_KEY_HERE" && (
                <p className="text-xs text-destructive mt-1 text-center">{t('api_key_warning')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartAssistant;

