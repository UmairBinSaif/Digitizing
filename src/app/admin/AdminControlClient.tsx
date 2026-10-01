'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    X, 
    Eye, 
    TrendingUp,
    Clock, 
    ShieldCheck, 
    ExternalLink,
    DollarSign,
    Zap,
    LayoutDashboard,
    Package,
    History,
    Search,
    AlertTriangle,
    CheckCircle,
    Info,
    RefreshCw,
    BarChart3,
    Sparkles,
    MessageSquare,
    Loader2,
    Globe,
    Lock,
    Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { approveProduct, rejectProduct, markPayoutAsPaid, approveSeller, rejectSeller, clearAdminSecretSession } from '@/lib/seller-actions';
import { settleOrder } from '@/lib/order-actions';
import { updateCustomRequestStatus } from '@/lib/custom-request-actions';
import { useCurrency } from '@/context/CurrencyContext';

export default function AdminControlClient({ 
    initialPendingProducts, 
    initialPayoutRequests, 
    initialOrders,
    initialPendingSellers,
    initialCustomRequests,
    initialTab = 'approvals'
}: any) {
    const [activeTab, setActiveTab] = useState<'approvals' | 'payouts' | 'orders' | 'identities' | 'quotes'>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingProducts, setPendingProducts] = useState(initialPendingProducts || []);
    const [payoutRequests, setPayoutRequests] = useState(initialPayoutRequests || []);
    const [pendingSellers, setPendingSellers] = useState(initialPendingSellers || []);
    const [customRequests, setCustomRequests] = useState(initialCustomRequests || []);
    const [orders, setOrders] = useState(initialOrders || []);
    const [isActioning, setIsActioning] = useState<string | null>(null);
    const [quoteData, setQuoteData] = useState<{ [id: string]: { amount: string; note: string } }>({});
    const { isMegaBundleEnabled, setMegaBundleEnabled, isFlashOrdersEnabled, setFlashOrdersEnabled } = useCurrency();

    // WORLD CHAT STATE
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        if (!supabase) return;

        const fetchMessages = async () => {
            const { data } = await supabase!.from('world_chat').select('*').order('created_at', { ascending: true }).limit(50);
            if (data && data.length > 0) {
                 setMessages(data.map(m => ({
                     id: m.id,
                     sender: m.sender,
                     rank: m.rank,
                     text: m.text,
                     isMe: m.sender === 'Admin'
                 })));
            }
        };
        fetchMessages();

        const channel = supabase!.channel('world_chat_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'world_chat' },
                (payload) => {
                    const newMsg = payload.new;
                    setMessages(prev => {
                        if (prev.some(p => p.id === newMsg.id)) return prev;
                        return [...prev, {
                            id: newMsg.id,
                            sender: newMsg.sender,
                            rank: newMsg.rank,
                            text: newMsg.text,
                            isMe: newMsg.sender === 'Admin'
                        }];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase!.removeChannel(channel);
        };
    }, []);

    // Global Statistics Calculation
    const stats = {
        throughput: orders.length,
        pendingArt: pendingProducts.length,
        payoutQueue: payoutRequests.length,
        quotesActive: customRequests.length
    };

    const handleApproveSeller = async (id: string) => {
        setIsActioning(id);
        await approveSeller(id);
        setPendingSellers((prev: any) => prev.filter((s: any) => s.id !== id));
        setIsActioning(null);
    };

    const handleRejectSeller = async (id: string) => {
        setIsActioning(id);
        await rejectSeller(id);
        setPendingSellers((prev: any) => prev.filter((s: any) => s.id !== id));
        setIsActioning(null);
    };

    const handleApprove = async (id: string) => {
        setIsActioning(id);
        await approveProduct(id);
        setPendingProducts((prev: any) => prev.filter((p: any) => p.id !== id));
        setIsActioning(null);
    };

    const handleMarkPaid = async (requestId: string) => {
        setIsActioning(requestId);
        await markPayoutAsPaid(requestId);
        setPayoutRequests((prev: any) => prev.filter((r: any) => r.id !== requestId));
        setIsActioning(null);
    };

    const handleSettleOrder = async (orderId: string) => {
        setIsActioning(orderId);
        try {
            await settleOrder(orderId);
            setOrders((prev: any) => prev.map((o: any) => o.id === orderId ? { ...o, status: 'Settled' } : o));
        } catch (error) {
            console.error(error);
            alert("Settlement Failure: Ensure protocol synchronization is active.");
        }
        setIsActioning(null);
    };

    const handleRejectProduct = async (id: string) => {
        setIsActioning(id);
        try {
            await rejectProduct(id);
            setPendingProducts((prev: any) => prev.filter((p: any) => p.id !== id));
        } catch (error) {
            console.error("Reject product error:", error);
        }
        setIsActioning(null);
    };

    const handleDeployQuote = async (requestId: string) => {
        const data = quoteData[requestId];
        const amount = data?.amount ? parseFloat(data.amount) : undefined;
        const note = data?.note;
        setIsActioning(requestId);
        try {
            await updateCustomRequestStatus(requestId, 'QUOTED', amount, note);
            setCustomRequests((prev: any) => prev.map((q: any) => q.id === requestId ? { ...q, status: 'QUOTED', quoteAmount: amount, adminNote: note } : q));
        } catch (error) {
            console.error("Deploy quote error:", error);
        }
        setIsActioning(null);
    };

    const handleRejectCustomRequest = async (requestId: string) => {
        setIsActioning(requestId);
        try {
            await updateCustomRequestStatus(requestId, 'REJECTED');
            setCustomRequests((prev: any) => prev.filter((q: any) => q.id !== requestId));
        } catch (error) {
            console.error("Reject custom request error:", error);
        }
        setIsActioning(null);
    };

    const handleDelayRequest = (requestId: string) => {
        alert("Authorization Delayed: This request will be held for manual verification.");
        // In a real app, you might update a 'delayed' field in DB
    };

    return (
        <>
            <div className="min-h-screen bg-[#050505] text-zinc-100 pt-24 pb-32 px-6">
                <div className="max-w-7xl mx-auto space-y-16">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-white/5 pb-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-[#0064a5] opacity-80">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0064a5] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0064a5]"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">ADMIN CONTROL CENTER ACTIVE</span>
                        </div>
                        <h1 className="text-6xl font-[family-name:var(--font-playfair)] tracking-tight">
                            ADMIN <span className="text-zinc-600 block italic leading-none">CONTROL PANEL</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                        {/* Protocol Modulators */}
                        <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 px-8 py-3 rounded-full">
                            <div className="flex items-center gap-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isMegaBundleEnabled ? 'text-[#FFD700]' : 'text-zinc-600'}`}>Mega Bundle</span>
                                <button 
                                    onClick={() => setMegaBundleEnabled(!isMegaBundleEnabled)}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner ${isMegaBundleEnabled ? 'bg-[#FFD700]/20' : 'bg-zinc-900'}`}
                                >
                                    <div className={`absolute top-1 transition-all duration-500 w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)] ${isMegaBundleEnabled ? 'right-1 bg-[#FFD700] opacity-100' : 'left-1 bg-zinc-600 opacity-40 shadow-none'}`} />
                                </button>
                            </div>
                            <div className="w-px h-4 bg-white/5" />
                            <div className="flex items-center gap-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isFlashOrdersEnabled ? 'text-[#00E5FF]' : 'text-zinc-600'}`}>Flash FOMO</span>
                                <button 
                                    onClick={() => setFlashOrdersEnabled(!isFlashOrdersEnabled)}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner ${isFlashOrdersEnabled ? 'bg-[#00E5FF]/20' : 'bg-zinc-900'}`}
                                >
                                    <div className={`absolute top-1 transition-all duration-500 w-4 h-4 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.5)] ${isFlashOrdersEnabled ? 'right-1 bg-[#00E5FF] opacity-100' : 'left-1 bg-zinc-600 opacity-40 shadow-none'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="relative group">
                            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-accent-neonBlue transition-colors" />
                            <input 
                                type="text"
                                placeholder="COMMAND SEARCH..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-black/40 border border-white/5 rounded-full pl-12 pr-6 py-4 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-accent-neonBlue/30 transition-all w-64 placeholder:text-zinc-800 font-mono"
                            />
                        </div>

                        <button
                            onClick={async () => {
                                await clearAdminSecretSession();
                                window.location.href = '/';
                            }}
                            className="flex items-center gap-2 px-6 py-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[9px] uppercase font-black tracking-widest group shadow-lg"
                            title="Lock Admin and Return to Store"
                        >
                            <Lock size={12} className="group-hover:scale-110 transition-transform" />
                            <span>Lock Panel</span>
                        </button>
                    </div>
                </div>

                {/* Statistics Telemetry */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'TOTAL STITCH-OUTS', value: stats.throughput, icon: Zap, color: 'text-[#0064a5]' },
                        { label: 'PENDING DIGITIZATIONS', value: stats.pendingArt, icon: Clock, color: 'text-[#FFD700]' },
                        { label: 'PAYOUT PIPELINE', value: stats.payoutQueue, icon: History, color: 'text-purple-500' },
                        { label: 'CUSTOM ORDER STREAM', value: stats.quotesActive, icon: Sparkles, color: 'text-green-500' },
                    ].map((s: any, i: number) => (
                        <div key={i} className="glass-card p-6 border-white/5 bg-white/[0.01] hover:border-white/10 transition-all group overflow-hidden relative">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <s.icon size={12} className={`${s.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                <BarChart3 size={12} className="text-zinc-900 group-hover:text-zinc-700 transition-colors" />
                            </div>
                            <div className="text-4xl font-bold text-white mb-2 relative z-10">{s.value}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-700 relative z-10 tracking-[0.3em]">{s.label}</div>
                            <div className={`absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700 ${s.color}`}>
                                <s.icon size={100} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Admin Navigation Tabs */}
                <div className="flex justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-2 glass-effect p-2 rounded-[2.5rem] border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                        {[
                            { id: 'approvals', label: 'ASSETS', icon: Package },
                            { id: 'identities', label: 'SELLERS', icon: ShieldCheck },
                            { id: 'quotes', label: 'CUSTOM QUOTES', icon: Zap },
                            { id: 'payouts', label: 'PAYOUTS', icon: DollarSign },
                            { id: 'orders', label: 'ORDERS', icon: History },
                        ].map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all duration-700 relative ${
                                    activeTab === tab.id ? 'bg-white text-black shadow-2xl scale-105' : 'text-zinc-600 hover:text-white'
                                }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                {(tab.id === 'approvals' && pendingProducts.length > 0) && (
                                    <span className="w-5 h-5 rounded-full bg-[#0064a5] text-white flex items-center justify-center text-[8px] font-black animate-pulse shadow-[0_0_15px_#0064a5]">
                                        {pendingProducts.length}
                                    </span>
                                )}
                                {(tab.id === 'identities' && pendingSellers.length > 0) && (
                                    <span className="w-5 h-5 rounded-full bg-[#FFD700] text-black flex items-center justify-center text-[8px] font-black animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                                        {pendingSellers.length}
                                    </span>
                                )}
                                {(tab.id === 'quotes' && customRequests.length > 0) && (
                                    <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[8px] font-black animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                        {customRequests.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {/* ASSET APPROVALS */}
                    {activeTab === 'approvals' && (
                        <motion.div 
                            key="approvals"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="space-y-10"
                        >
                            {pendingProducts.length === 0 ? (
                                <div className="glass-card p-32 text-center border-dashed border-2 border-white/5">
                                    <h3 className="text-2xl font-[family-name:var(--font-playfair)] text-zinc-700 italic">No assets awaiting authorization.</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {pendingProducts.map((p: any) => (
                                        <div key={p.id} className="glass-card overflow-hidden bg-black/40 border-white/5 group hover:border-[#0064a5]/40 hover:shadow-[0_0_30px_rgba(0,100,165,0.1)] transition-all duration-700">
                                            <div className="relative aspect-[4/3] w-full bg-zinc-900 border-b border-white/5 overflow-hidden">
                                                <img src={p.image} className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-700 group-hover:scale-105" />
                                                <div className="absolute top-4 left-4 bg-black/80 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                    <span className="text-[8px] text-yellow-500 font-black uppercase tracking-widest">PENDING VERIFICATION</span>
                                                </div>
                                            </div>
                                            <div className="p-8 space-y-6">
                                                <div>
                                                    <h3 className="text-xl font-[family-name:var(--font-playfair)] text-white tracking-wide">{p.name}</h3>
                                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mt-2">SELLER: {p.seller?.name || 'Unknown'}</p>
                                                </div>
                                                <div className="flex justify-between items-center py-4 border-b border-white/5">
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">STITCH COUNT</span>
                                                        <p className="text-xs text-white uppercase font-black">{p.stitchCount || '25,000'}</p>
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <span className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">FORMAT TYPE</span>
                                                        <p className="text-xs text-[#0064a5] uppercase font-black">{p.formatType || '.DST / .EMB'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end border-b border-white/5 pb-6">
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">ASK PRICE</span>
                                                        <p className="text-xl text-[#0064a5] font-light">₨.{Number(p.price).toLocaleString()}</p>
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <span className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">ARTISAN COMMISSION</span>
                                                        <p className="text-xl text-[#FFD700] font-light">₨.{(p.price * 0.8).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    <button 
                                                        onClick={() => handleApprove(p.id)}
                                                        disabled={!!isActioning}
                                                        className="bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-[#0064a5] hover:text-white hover:shadow-[0_0_15px_#0064a5] transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
                                                    >
                                                        {isActioning === p.id ? 'RELEASING...' : 'APPROVE & RELEASE'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectProduct(p.id)}
                                                        disabled={!!isActioning}
                                                        className="bg-black/80 border border-white/10 text-red-500 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_#ef4444] transition-all disabled:opacity-50"
                                                    >
                                                        {isActioning === p.id ? 'REJECTING...' : 'REJECT ASSET'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* PAYOUT REQUESTS */}
                    {activeTab === 'payouts' && (
                        <motion.div 
                            key="payouts"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass-card border-white/10 overflow-hidden"
                         >
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">REQUEST ID</th>
                                        <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">ARTISAN ENTITY</th>
                                        <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">PAYMENT NODE</th>
                                        <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">NET ASSET (PKR)</th>
                                        <th className="p-8 text-right text-[9px] uppercase tracking-widest font-black text-zinc-500">AUTHORIZATION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payoutRequests.length === 0 ? (
                                        <tr><td colSpan={5} className="p-32 text-center text-zinc-700 italic font-[family-name:var(--font-playfair)] text-2xl">No payout requests found in global buffer.</td></tr>
                                    ) : payoutRequests.map((r: any) => (
                                        <tr key={r.id} className="group hover:bg-white/[0.02] transition-all">
                                            <td className="p-8 text-xs font-mono text-zinc-600">#{r.id.slice(-8)}</td>
                                            <td className="p-8">
                                                <div className="font-bold text-white uppercase tracking-widest text-[11px]">{r.user?.name}</div>
                                                <p className="text-[9px] text-zinc-600 mt-1 uppercase font-black">{r.user?.email}</p>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold">
                                                        <DollarSign size={14} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">{r.user?.paymentMethod}</span>
                                                        <p className="text-[9px] text-zinc-600 uppercase font-black mt-1">{r.user?.accountNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className="text-xl text-accent-gold font-light tracking-widest">₨.{Number(r.amount).toLocaleString()}</span>
                                            </td>
                                            <td className="p-8 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button 
                                                        onClick={() => handleDelayRequest(r.id)}
                                                        className="bg-black/40 border border-white/10 text-zinc-500 text-[9px] font-black uppercase tracking-widest px-6 py-4 rounded-xl hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all"
                                                    >
                                                        HOLD 
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMarkPaid(r.id)}
                                                        disabled={!!isActioning}
                                                        className="bg-[#0064a5] text-white text-[9px] font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[#0064a5]/90 hover:shadow-[0_0_15px_#0064a5] transition-all shadow-2xl disabled:opacity-50"
                                                    >
                                                        {isActioning === r.id ? 'SETTLING...' : 'APPROVE'}
                                                    </button>
                                                </div>
                                             </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </motion.div>
                    )}

                    {/* IDENTITY APPROVALS */}
                    {activeTab === 'identities' && (
                        <motion.div 
                            key="identities"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="space-y-8"
                        >
                            {pendingSellers.length === 0 ? (
                                <div className="glass-card p-32 text-center border-dashed border-2 border-white/5">
                                    <h3 className="text-2xl font-[family-name:var(--font-playfair)] text-zinc-700 italic">No Identity Requests in queue.</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {pendingSellers.map((s: any) => (
                                        <div key={s.id} className="glass-card bg-black/40 border-white/5 p-10 space-y-10 hover:border-accent-gold/40 transition-all duration-700 group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 ring-4 ring-black/50">
                                                    <img src={s.image || '/ultimate_logo.png'} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-[family-name:var(--font-playfair)] text-white">{s.name}</h3>
                                                    <p className="text-[9px] text-[#FFD700] font-black tracking-widest uppercase mt-1">PREMIUM DIGITIZER</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8 py-6 border-y border-white/5">
                                                <div className="space-y-1">
                                                    <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">REGION</span>
                                                    <p className="text-xs text-white uppercase font-black">{s.country || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">PAYMENT NODE</span>
                                                    <p className="text-xs text-[#0064a5] uppercase font-black">{s.paymentMethod || 'JazzCash'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">COMMUNICATION</span>
                                                    <p className="text-xs text-white uppercase font-black">{s.whatsapp || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">ENTITY ID</span>
                                                    <p className="text-xs text-zinc-500 uppercase font-black">#{s.id.slice(-6)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => handleApproveSeller(s.id)}
                                                    disabled={!!isActioning}
                                                    className="py-5 rounded-2xl bg-white text-black text-[9px] font-black uppercase tracking-[0.3em] hover:bg-[#0064a5] hover:text-white hover:shadow-[0_0_20px_#0064a5] transition-all disabled:opacity-50"
                                                >
                                                    {isActioning === s.id ? 'SYNCING...' : 'GRANT MARKET ACCESS'}
                                                </button>
                                                <button 
                                                    onClick={() => handleRejectSeller(s.id)}
                                                    disabled={!!isActioning}
                                                    className="py-5 rounded-2xl bg-black/60 border border-white/10 text-red-500 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_0_20px_#ef4444] transition-all disabled:opacity-50"
                                                >
                                                    DECLINE
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                     {/* CUSTOM QUOTES */}
                    {activeTab === 'quotes' && (
                        <motion.div 
                            key="quotes"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            className="space-y-10"
                        >
                            {customRequests.length === 0 ? (
                                <div className="glass-card p-32 text-center border-dashed border-2 border-white/5">
                                    <h3 className="text-2xl font-[family-name:var(--font-playfair)] text-zinc-700 italic">No custom requests in protocol buffer.</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-8">
                                    {customRequests.map((q: any) => (
                                        <div key={q.id} className="glass-card bg-black/40 border-white/5 flex flex-col lg:flex-row overflow-hidden group hover:border-white/20 transition-all duration-500">
                                            <div className="w-full lg:w-96 aspect-square bg-zinc-900 relative overflow-hidden flex-shrink-0">
                                                <img src={q.image} className="w-full h-full object-contain mix-blend-lighten group-hover:scale-110 transition-transform duration-1000" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                                <div className="absolute bottom-6 left-6 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[#0064a5] animate-ping" />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Transmission Active</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 p-10 flex flex-col justify-between space-y-12">
                                                <div className="space-y-8">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] text-accent-neonBlue font-black uppercase tracking-[0.4em]">Request Node</span>
                                                                <div className="h-px w-12 bg-accent-neonBlue/20" />
                                                            </div>
                                                            <h3 className="text-3xl font-[family-name:var(--font-playfair)] text-white italic">{q.email}</h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest block mb-1">TIMESTAMP</span>
                                                            <p className="text-[10px] text-zinc-400 font-mono italic">{new Date(q.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 space-y-4">
                                                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest flex items-center gap-2">
                                                           <MessageSquare size={10} /> Instruction Packet
                                                        </span>
                                                        <p className="text-zinc-400 text-sm leading-relaxed font-light italic">
                                                            &quot;{q.instruction || 'Digital manifest is empty. Awaiting clarification...'}&quot;
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row items-center gap-6 border-t border-white/5 pt-10">
                                                    <div className="flex-1 flex gap-4 w-full">
                                                        <div className="flex-1 relative">
                                                            <TrendingUp size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#0064a5]" />
                                                            <input 
                                                              type="text" 
                                                              placeholder="ADMIN NOTE / STITCHES..." 
                                                              value={quoteData[q.id]?.note || ''}
                                                              onChange={(e) => setQuoteData(prev => ({
                                                                ...prev,
                                                                [q.id]: { ...(prev[q.id] || { amount: '' }), note: e.target.value }
                                                              }))}
                                                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-14 pr-6 py-5 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-[#0064a5] focus:shadow-[0_0_15px_rgba(0,100,165,0.2)] transition-all placeholder:text-zinc-800"
                                                            />
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <DollarSign size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#FFD700]" />
                                                            <input 
                                                              type="number" 
                                                              placeholder="ESTIMATE PK VALUATION..." 
                                                              value={quoteData[q.id]?.amount || ''}
                                                              onChange={(e) => setQuoteData(prev => ({
                                                                ...prev,
                                                                [q.id]: { ...(prev[q.id] || { note: '' }), amount: e.target.value }
                                                              }))}
                                                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-14 pr-6 py-5 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-[#FFD700] focus:shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all placeholder:text-zinc-800"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeployQuote(q.id)}
                                                        disabled={isActioning === q.id}
                                                        className="whitespace-nowrap px-12 py-5 bg-[#FFD700] text-black rounded-xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-[#FFD700] hover:shadow-[0_0_20px_#FFD700] transition-all group flex items-center gap-4 disabled:opacity-50"
                                                    >
                                                        <span>{isActioning === q.id ? 'TRANSMITTING...' : (q.status === 'QUOTED' ? 'RE-DEPLOY QUOTE' : 'DEPLOY STITCH QUOTE')}</span>
                                                        <TrendingUp size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectCustomRequest(q.id)}
                                                        disabled={isActioning === q.id}
                                                        title="Reject Request"
                                                        className="p-5 rounded-xl border border-white/5 bg-black/80 text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_#ef4444] transition-all disabled:opacity-50"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ORDER TELEMETRY */}
                    {activeTab === 'orders' && (
                        <motion.div 
                            key="orders"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'NODE THROUGHPUT', value: initialOrders.length, sub: 'TOTAL TRANSACTIONS', icon: Zap },
                                    { label: 'CLEARANCE RATIO', value: '100%', sub: 'VERIFIED SETTLEMENTS', icon: ShieldCheck }
                                ].map((s: any, i: number) => (
                                    <div key={i} className="glass-card p-8 border-white/5 bg-accent-neonBlue/[0.02]">
                                        <div className="flex items-center gap-4 mb-6">
                                            <s.icon size={14} className="text-accent-neonBlue opacity-50" />
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">{s.label}</h4>
                                        </div>
                                        <div className="text-4xl text-white font-[family-name:var(--font-playfair)] mb-2 tracking-tighter">{s.value}</div>
                                        <p className="text-[8px] text-accent-neonBlue font-black uppercase tracking-widest">{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-card border-white/10 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">PACKET ID</th>
                                            <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">COLLECTION ENTRY</th>
                                            <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">BUYER NODE</th>
                                            <th className="p-8 text-[9px] uppercase tracking-widest font-black text-zinc-500">VALUATION</th>
                                            <th className="p-8 text-right text-[9px] uppercase tracking-widest font-black text-zinc-500">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {orders.map((o: any) => (
                                            <tr key={o.id} className="group hover:bg-white/[0.01]">
                                                <td className="p-8 text-xs font-mono text-zinc-700">#{o.id.slice(-8)}</td>
                                                <td className="p-8">
                                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">{o.productId.slice(0, 8)}...</span>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#0064a5] shadow-[0_0_10px_#0064a5]" />
                                                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{o.buyerName || 'Encrypted Node'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <span className="text-lg text-white font-light tracking-widest font-sans">₨.{Number(o.price).toLocaleString()}</span>
                                                </td>
                                                <td className="p-8 text-right">
                                                    <div className="flex items-center justify-end gap-6">
                                                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border ${
                                                            o.status === 'Pending' 
                                                            ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' 
                                                            : 'text-green-500 bg-green-500/10 border-green-500/20'
                                                        }`}>
                                                            {o.status === 'Pending' ? 'AWAITING' : 'SETTLED'}
                                                        </span>
                                                        
                                                        {o.status === 'Pending' && (
                                                            <button 
                                                                onClick={() => handleSettleOrder(o.id)}
                                                                disabled={isActioning === o.id}
                                                                className="p-2 border border-white/10 rounded-lg hover:bg-green-500 hover:text-black hover:shadow-[0_0_15px_#22c55e] transition-all"
                                                                title="Mark as Settled"
                                                            >
                                                                {isActioning === o.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Global World Chat Floating Button */}
        {!isChatOpen && (
            <button 
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-8 z-[60] p-5 rounded-full bg-black/80 border border-white/10 text-white backdrop-blur-xl hover:border-[#0064a5] hover:shadow-[0_0_30px_rgba(0,100,165,0.4)] transition-all group shadow-2xl"
            >
                <Globe className="text-[#0064a5] group-hover:scale-110 transition-transform" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF003C] rounded-full border border-black animate-pulse shadow-[0_0_10px_#FF003C]" />
            </button>
        )}

        {/* Global World Chat Drawer */}
        <AnimatePresence>
            {isChatOpen && (
                <motion.div 
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
                    className="fixed top-0 right-0 h-screen w-full md:w-[450px] bg-[#050505]/95 border-l border-white/10 backdrop-blur-3xl z-[70] flex flex-col shadow-[-30px_0_100px_rgba(0,0,0,0.8)]"
                >
                    {/* Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 4px)' }}></div>
                    
                    {/* Header */}
                    <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/40 relative z-10">
                        <div>
                            <h3 className="text-[#0064a5] font-black uppercase tracking-[0.3em] text-[11px] flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-[#0064a5] animate-ping" />
                                GLOBAL SIGNAL NODE
                            </h3>
                            <p className="text-zinc-400 font-[family-name:var(--font-playfair)] italic mt-2 text-xs tracking-widest">
                                WORLD CHAT - ACTIVE USERS: 124
                            </p>
                        </div>
                        <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10 scrollbar-hide">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {!m.isMe && <span className="text-[9px] text-[#FFD700] uppercase font-black tracking-widest">[{m.rank}]</span>}
                                    <span className="text-[10px] text-zinc-400 font-mono italic">{m.sender}</span>
                                    {m.isMe && <span className="text-[9px] text-[#0064a5] uppercase font-black tracking-widest">[{m.rank}]</span>}
                                </div>
                                <div className={`px-5 py-4 max-w-[85%] rounded-2xl border backdrop-blur-md text-sm font-[family-name:var(--font-playfair)] tracking-wide leading-relaxed ${
                                    m.isMe 
                                        ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700] rounded-tr-sm shadow-[0_0_20px_rgba(255,215,0,0.15)]' 
                                        : 'bg-[#0064a5]/10 border-[#0064a5]/30 text-white rounded-tl-sm shadow-[0_0_20px_rgba(0,100,165,0.15)]'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        
                        <div className="flex items-center gap-3 text-zinc-500 pt-4">
                            <Loader2 size={12} className="animate-spin text-[#0064a5]" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black animate-pulse">Transmitting...</span>
                        </div>
                    </div>

                    {/* Input Node */}
                    <div className="p-8 border-t border-white/10 bg-black/60 relative z-10">
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!chatMessage) return;
                                
                                const newMsg = {
                                    sender: 'Admin',
                                    rank: 'ORCHESTRATOR',
                                    text: chatMessage
                                };
                                
                                setChatMessage('');

                                if (supabase) {
                                    await supabase.from('world_chat').insert([newMsg]);
                                } else {
                                    setMessages(prev => [...prev, { id: Date.now(), ...newMsg, isMe: true }]);
                                }
                            }}
                            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus-within:border-[#FFD700] focus-within:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all group"
                        >
                            <div className="text-zinc-500 group-focus-within:text-[#FFD700] transition-colors">
                                <Lock size={16} />
                            </div>
                            <span className="text-[#0064a5] font-mono text-xs font-black">&gt;</span>
                            <input 
                                type="text" 
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Enter Signal..."
                                className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs placeholder:text-zinc-600 tracking-wider"
                            />
                            <button type="submit" disabled={!chatMessage} className="text-[#0064a5] hover:text-[#FFD700] transition-colors disabled:opacity-50">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
