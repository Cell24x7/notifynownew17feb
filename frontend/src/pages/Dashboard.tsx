import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Users, Zap, Send, TrendingUp, TrendingDown,
  BarChart3, MessageCircle, Phone, Mail, Instagram, Facebook,
  Smartphone, Star, ArrowUpRight, ArrowDownRight, Bot,
  UserCog, UserCircle, Activity, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const satisfactionData = [
  { name: 'Jan', WhatsApp: 4.1, SMS: 3.8, Instagram: 4.3, Messenger: 4.0 },
  { name: 'Feb', WhatsApp: 4.5, SMS: 4.1, Instagram: 4.4, Messenger: 4.2 },
  { name: 'Mar', WhatsApp: 4.5, SMS: 4.2, Instagram: 4.5, Messenger: 4.3 },
  { name: 'Apr', WhatsApp: 4.6, SMS: 4.3, Instagram: 4.6, Messenger: 4.4 },
  { name: 'May', WhatsApp: 4.8, SMS: 4.3, Instagram: 4.4, Messenger: 4.1 },
  { name: 'Jun', WhatsApp: 4.6, SMS: 4.3, Instagram: 4.2, Messenger: 4.1 },
];

const resolutionData = [
  { name: 'Voice', bot: 85, human: 15 },
  { name: 'Email', bot: 40, human: 60 },
  { name: 'RCS', bot: 50, human: 50 },
  { name: 'Messenger', bot: 50, human: 50 },
  { name: 'Instagram', bot: 50, human: 50 },
  { name: 'SMS', bot: 70, human: 30 },
  { name: 'WhatsApp', bot: 58, human: 42 },
];

const channelCardsData = [
  { name: 'WhatsApp', rating: '4.7', messages: '45,680', delivery: '98.3%', response: '2m 15s', bot: 18200, human: 13900, icon: <MessageSquare className="h-4 w-4 text-emerald-500" /> },
  { name: 'SMS', rating: '4.2', messages: '28,450', delivery: '98.0%', response: '5m 30s', bot: 8900, human: 3550, icon: <MessageCircle className="h-4 w-4 text-blue-500" /> },
  { name: 'Instagram', rating: '4.5', messages: '15,680', delivery: '98.3%', response: '8m 45s', bot: 5600, human: 5640, icon: <Instagram className="h-4 w-4 text-pink-500" /> },
  { name: 'Messenger', rating: '4.4', messages: '12,450', delivery: '98.6%', response: '6m 20s', bot: 4920, human: 4950, icon: <Facebook className="h-4 w-4 text-blue-600" /> },
  { name: 'RCS', rating: '4.6', messages: '5,890', delivery: '98.1%', response: '3m 10s', bot: 2280, human: 2280, icon: <Smartphone className="h-4 w-4 text-purple-500" /> },
  { name: 'Email', rating: '4.3', messages: '8,920', delivery: '98.1%', response: '2h 15m', bot: 980, human: 1470, icon: <Mail className="h-4 w-4 text-amber-500" /> },
  { name: 'Voice Bot', rating: '4.1', messages: '3,450', delivery: '98.0%', response: '15s', bot: 2450, human: 440, icon: <Phone className="h-4 w-4 text-teal-500" /> },
];

const agentsData = [
  { initials: 'JS', bg: 'bg-emerald-100 text-emerald-700', name: 'John Smith', status: 'Online', statusColor: 'text-emerald-600 bg-emerald-50', assigned: 245, closed: 230, open: 15, rating: '4.8', firstRes: '1m 23s', avgRes: '2m 45s', avgClose: '12m 30s', rate: 94 },
  { initials: 'SJ', bg: 'bg-emerald-100 text-emerald-700', name: 'Sarah Johnson', status: 'Online', statusColor: 'text-emerald-600 bg-emerald-50', assigned: 312, closed: 298, open: 14, rating: '4.9', firstRes: '45s', avgRes: '1m 58s', avgClose: '8m 15s', rate: 96 },
  { initials: 'MW', bg: 'bg-emerald-100 text-emerald-700', name: 'Mike Wilson', status: 'Busy', statusColor: 'text-amber-600 bg-amber-50', assigned: 189, closed: 165, open: 24, rating: '4.5', firstRes: '2m 10s', avgRes: '4m 20s', avgClose: '18m 45s', rate: 87 },
];

const PIE_COLORS = ['#34d399', '#3b82f6', '#ec4899', '#6366f1', '#a855f7'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('All');

  // Fetch real stats based on Role
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token || !user) return;

        const isAdmin = user.role === 'superadmin' || user.role === 'admin' || user.role === 'reseller';
        const endpoint = isAdmin ? '/api/dashboard/super-admin' : '/api/dashboard/stats';

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) { }
    };
    
    fetchStats();
    
    // Live update simulation interval
    const interval = setInterval(() => {
        fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const totalConvos = stats?.totalConversations || 0;
  const campaignsSent = stats?.campaignsSent || 0;
  const activeChats = stats?.activeChats || 0;
  const automationsTriggered = stats?.automationsTriggered || 0;

  // Use weeklyChats stats if available, otherwise mock
  const activityData = stats?.weeklyChats?.length > 0
    ? [...stats.weeklyChats].reverse().map(w => ({ name: w.day, count: w.count }))
    : [
      { name: 'Mon', count: 0 }, { name: 'Tue', count: 0 }, { name: 'Wed', count: 0 },
      { name: 'Thu', count: 0 }, { name: 'Fri', count: 0 }, { name: 'Sat', count: 0 }, { name: 'Sun', count: 0 }
    ];

  // Dynamic pie data
  const pieData = stats?.channelPercentages?.length > 0 
    ? stats.channelPercentages 
    : [
        { name: 'WhatsApp', value: 0 },
        { name: 'SMS', value: 0 },
      ];

  // Dynamic channel analytics data
  let totalMessages = 0;
  let totalDelivered = 0;
  
  if (stats && stats.channelStats) {
    if (activeTab === 'All') {
      Object.values(stats.channelStats).forEach((cStat: any) => {
        totalMessages += cStat.totalMessages || 0;
        totalDelivered += cStat.delivered || 0;
      });
    } else {
      const cStat = stats.channelStats[activeTab.toLowerCase()] || { totalMessages: 0, delivered: 0 };
      totalMessages = cStat.totalMessages || 0;
      totalDelivered = cStat.delivered || 0;
    }
  }

  const botHandled = Math.floor(totalMessages * 0.6);
  const humanHandled = totalMessages - botHandled;
  const avgDeliveryRate = totalMessages > 0 ? ((totalDelivered / totalMessages) * 100).toFixed(1) + '%' : '0%';

  // Update and Filter small mini channel cards
  const dynamicChannelCards = channelCardsData.filter(c => {
    if (!user) return false;
    
    const isAdmin = user.role === 'superadmin' || user.role === 'admin' || user.role === 'reseller';
    
    // Fallback enabled channels list from user object
    const enabledList = Array.isArray(user?.channels_enabled)
      ? user.channels_enabled.map((ch: any) => ch.toLowerCase())
      : typeof user?.channels_enabled === 'string'
        ? (user.channels_enabled as string).split(',').map(ch => ch.trim().toLowerCase())
        : ['whatsapp', 'sms', 'rcs'];

    // RULE 1: If Admin, show everything that HAS DATA
    if (isAdmin) {
       if (stats && stats.channelStats) {
          const s = stats.channelStats[c.name.toLowerCase()];
          return s && Number(s.totalMessages) > 0;
       }
       return ['WhatsApp', 'SMS', 'RCS'].includes(c.name);
    }

    // RULE 2: If Client, only show what is ENBALED for them in settings
    return enabledList.includes(c.name.toLowerCase());

  }).map(c => {
    const s = stats?.channelStats?.[c.name.toLowerCase()];
    if (s) {
      const bot = Math.floor(s.totalMessages * 0.6);
      const human = s.totalMessages - bot;
      return {
        ...c,
        messages: s.totalMessages.toLocaleString(),
        delivery: s.deliveryRate + '%',
        bot,
        human
      };
    }
    return { ...c, messages: '0', delivery: '0%', bot: 0, human: 0 };
  });

  const renderTrend = (value: string, isUp: boolean) => (
    <span className={cn("text-xs font-medium flex items-center gap-1", isUp ? "text-emerald-500" : "text-rose-500")}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {value}
    </span>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 bg-white min-h-screen font-sans text-slate-800">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Comprehensive insights across all your communication channels.</p>
      </div>

      {/* Top 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              {renderTrend("+12.5%", true)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{totalConvos.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium">Total Conversations</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <Users className="h-5 w-5 text-indigo-500" />
              {renderTrend("+8.2%", true)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{activeChats.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium">Active Chats</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <Zap className="h-5 w-5 text-amber-500" />
              {renderTrend("+23.1%", true)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{automationsTriggered.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium">Automations Triggered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <Send className="h-5 w-5 text-rose-500" />
              {renderTrend("-2.4%", false)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{campaignsSent.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 font-medium">Campaigns Sent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Analytics Section */}
      <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Channel Analytics</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-1.5 rounded-xl w-fit border border-slate-100">
            {['All', 'Whatsapp', 'Sms', 'Instagram', 'Messenger', 'Rcs', 'Email', 'Voice'].filter(tab => {
               if (!user) return false;
               if (tab === 'All') return true;
               const isAdmin = user.role === 'superadmin' || user.role === 'admin' || user.role === 'reseller';
               if (isAdmin) return true;
               
               const enabledList = Array.isArray(user?.channels_enabled)
                ? user.channels_enabled.map((ch: any) => ch.toLowerCase())
                : typeof user?.channels_enabled === 'string'
                  ? (user.channels_enabled as string).split(',').map(ch => ch.trim().toLowerCase())
                  : ['whatsapp', 'sms', 'rcs'];
               return enabledList.includes(tab.toLowerCase());
            }).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-transparent",
                  activeTab === tab ? "bg-white shadow-sm border-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab === 'All' && <Activity className="h-3 w-3 text-slate-700"/>}
                {tab === 'Whatsapp' && <MessageSquare className="h-3 w-3 text-emerald-500" />}
                {tab === 'Sms' && <MessageCircle className="h-3 w-3 text-blue-500" />}
                {tab === 'Instagram' && <Instagram className="h-3 w-3 text-pink-500" />}
                {tab === 'Messenger' && <Facebook className="h-3 w-3 text-blue-600" />}
                {tab === 'Rcs' && <Smartphone className="h-3 w-3 text-purple-500" />}
                {tab === 'Email' && <Mail className="h-3 w-3 text-slate-500" />}
                {tab === 'Voice' && <Phone className="h-3 w-3 text-slate-500" />}
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-500 tracking-wide uppercase">Total Messages</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalMessages.toLocaleString()}</p>
            </div>
            
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-500 tracking-wide uppercase">Delivered</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{avgDeliveryRate}</p>
            </div>

            <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="text-[11px] font-bold text-blue-500 tracking-wide uppercase">Bot Handled</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{botHandled.toLocaleString()}</p>
            </div>

            <div className="border border-purple-100 bg-purple-50/50 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="h-4 w-4 text-purple-500" />
                <span className="text-[11px] font-bold text-purple-500 tracking-wide uppercase">Human Handled</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{humanHandled.toLocaleString()}</p>
            </div>

            <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-600 tracking-wide uppercase">Avg Satisfaction</span>
              </div>
              <p className="text-2xl font-black text-slate-900">4.4/5</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Row: Satisfaction Trends & Bot vs Human Resolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-slate-800">Customer Satisfaction Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-2">
            <div className="h-[250px] w-full">
              <ResponsiveContainer>
                <LineChart data={satisfactionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis domain={[3.5, 5]} ticks={[3.5, 3.9, 4.3, 5]} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="WhatsApp" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="SMS" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Instagram" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Messenger" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-emerald-600">WhatsApp</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-blue-500 bg-white shadow-inner"></div><span className="text-blue-600">SMS</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-rose-500 bg-white shadow-inner"></div><span className="text-rose-600">Instagram</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-blue-600">Messenger</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-slate-800">Bot vs Human Resolution by Channel</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer>
                <BarChart data={resolutionData} layout="vertical" barSize={20} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={80} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="bot" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="human" stackId="a" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Bot Handled</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-pink-500 rounded-sm"></div> Human Handled</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Micro Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dynamicChannelCards.map((item) => (
          <Card key={item.name} className="rounded-xl border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-emerald-200 transition-colors">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                    {item.icon}
                  </div>
                  <span className="font-extrabold text-slate-900 text-[14px] tracking-tight">{item.name}</span>
                </div>
                <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] px-2 py-0 h-6 rounded-lg flex items-center gap-1 border-none shadow-md font-bold">
                  <Star className="h-2.5 w-2.5 fill-white text-white" /> {item.rating}
                </Badge>
              </div>

              <div className="space-y-3 mt-1">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-semibold">Messages</span>
                  <span className="font-black text-slate-900 tabular-nums">{item.messages}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-semibold whitespace-nowrap">Delivery Rate</span>
                  <span className="font-black text-emerald-500 tabular-nums">{item.delivery}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-semibold whitespace-nowrap">Avg Response</span>
                  <div className="flex flex-col items-end">
                    <span className="font-black text-slate-900 tabular-nums leading-none">{item.response}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 mt-auto">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase mb-2 tracking-wider">
                <span>Bot: {item.bot}</span>
                <span>Human: {item.human}</span>
              </div>
              <div className="flex h-2 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                <div style={{ width: `${(item.bot / (item.bot + item.human + 0.1)) * 100}%` }} className="bg-emerald-400 h-full border-r border-white/20 shadow-sm"></div>
                <div style={{ width: `${(item.human / (item.bot + item.human + 0.1)) * 100}%` }} className="bg-pink-400 h-full shadow-sm"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row: Weekly Chat Activity && Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-xl border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Weekly Chat Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer>
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} ticks={[0, 55, 110, 165, 220]} domain={[0, 220]} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-slate-800">Channel Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center">
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 space-y-2.5 px-2">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    {item.name === 'WhatsApp' && <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />}
                    {item.name === 'SMS' && <MessageCircle className="h-3.5 w-3.5 text-blue-500" />}
                    {item.name === 'Instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                    {item.name === 'Facebook' && <Facebook className="h-3.5 w-3.5 text-blue-600" />}
                    {item.name === 'RCS' && <Smartphone className="h-3.5 w-3.5 text-purple-500" />}
                    <span className="text-slate-600 font-medium font-sans">{item.name}</span>
                  </div>
                  <span className={cn("font-semibold", 
                    i===0 ? "text-emerald-500" : 
                    i===1 ? "text-blue-500" : 
                    i===2 ? "text-pink-500" : 
                    i===3 ? "text-blue-600" : "text-purple-500"
                  )}>{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Open Chats</p>
              <h3 className="text-2xl font-black text-emerald-500">{(stats?.openChats || 0).toLocaleString()}</h3>
            </div>
            <MessageSquare className="h-6 w-6 text-emerald-400" />
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Closed Chats</p>
              <h3 className="text-2xl font-black text-slate-900">{(stats?.closedChats || 0).toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Response Rate</p>
              <h3 className="text-2xl font-black text-emerald-500">94.2%</h3>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-white pb-4 pt-6 border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" /> Agent Performance Analytics
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-4 px-6">Agent</th>
                <th className="py-4 px-4 text-center">Assigned</th>
                <th className="py-4 px-4 text-center">Closed</th>
                <th className="py-4 px-4 text-center">Open</th>
                <th className="py-4 px-4 text-center">Rating</th>
                <th className="py-4 px-4 text-center">First Response</th>
                <th className="py-4 px-4 text-center">Avg Response</th>
                <th className="py-4 px-4 text-center">Avg Closing</th>
                <th className="py-4 px-6 text-center">Resolution Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agentsData.map((agent, idx) => (
                <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-9 w-9 rounded-full flex justify-center items-center font-bold text-xs", agent.bg)}>
                        {agent.initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[13px]">{agent.name}</p>
                        <Badge className={cn("text-[9px] px-1.5 py-0 rounded border-none hover:bg-transparent mt-0.5", agent.statusColor)}>
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800 text-xs">{agent.assigned}</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-500 text-xs">{agent.closed}</td>
                  <td className="py-4 px-4 text-center font-bold text-amber-500 text-xs">{agent.open}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-800 text-xs">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {agent.rating}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-emerald-500 text-xs">{agent.firstRes}</td>
                  <td className="py-4 px-4 text-center font-semibold text-slate-500 text-xs">{agent.avgRes}</td>
                  <td className="py-4 px-4 text-center font-semibold text-slate-500 text-xs">
                    {/* The design splits avg closing into two lines for some reason based on width, we just show simple */}
                    <div className="w-10 mx-auto leading-tight">{agent.avgClose}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${agent.rate}%` }}></div>
                      </div>
                      <span className="font-bold text-emerald-500 text-xs">{agent.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
