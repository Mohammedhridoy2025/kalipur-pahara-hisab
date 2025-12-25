import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Member, Subscription, AppNotification } from '../types';
import { Printer, Banknote, Edit2, Trash2, Search, ChevronDown, ChevronUp, Loader2, Calendar, User, CircleDollarSign, CheckCircle2, ShieldCheck, Quote, Home, MapPin, UserCheck, XCircle, Download, AlertTriangle, AlertOctagon, Lock } from 'lucide-react';
import { getMotivationalQuote } from '../services/geminiService';
import { db, trashCol } from '../services/firebase';
import html2canvas from 'html2canvas';

interface CollectionManagerProps {
  members: Member[];
  subscriptions: Subscription[];
  setSubscriptions: (s: Subscription[]) => void;
  initialMemberId?: string;
  onClearPreSelection?: () => void;
  isAdmin: boolean;
  addNotification?: (type: AppNotification['type'], title: string, message: string) => void;
}

const MIN_MONTH = "2024-01";
const FIXED_ADDRESS = "কালিপুর, হোমনা, কুমিল্লা";

type SortKey = 'memberName' | 'month' | 'amount' | 'date';

const CollectionManager: React.FC<CollectionManagerProps> = ({ 
  members, 
  subscriptions, 
  setSubscriptions, 
  initialMemberId,
  onClearPreSelection,
  isAdmin,
  addNotification
}) => {
  const [selectedMember, setSelectedMember] = useState(initialMemberId || '');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [amount, setAmount] = useState(0); 
  const [receivedBy, setReceivedBy] = useState('কাউছার');
  const [customDate, setCustomDate] = useState<string>(new Date().toLocaleDateString('bn-BD'));
  const [month, setMonth] = useState(() => {
    const current = new Date().toISOString().slice(0, 7);
    return current < MIN_MONTH ? MIN_MONTH : current;
  });
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Subscription | null>(null);
  const [receiptQuote, setReceiptQuote] = useState<string>('');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: SortKey, direction: 'asc' | 'desc'}>({ key: 'date', direction: 'desc' });

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '';
  const getMemberHouse = (id: string) => members.find(m => m.id === id)?.houseName || 'অজানা বাড়ি';

  useEffect(() => {
    if (initialMemberId) {
      const member = members.find(m => m.id === initialMemberId);
      if (member) {
        setSelectedMember(member.id);
        setMemberSearchTerm(member.name);
        setTimeout(() => amountRef.current?.focus(), 150);
      }
    }
  }, [initialMemberId, members]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedSubscriptions = useMemo(() => {
    let items = [...subscriptions];
    items.sort((a, b) => {
      let valA: any, valB: any;
      if (sortConfig.key === 'memberName') {
        valA = getMemberName(a.memberId);
        valB = getMemberName(b.memberId);
      } else {
        valA = a[sortConfig.key as keyof Subscription] || '';
        valB = b[sortConfig.key as keyof Subscription] || '';
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [subscriptions, sortConfig, members]);

  const handleDelete = async () => {
    if (!confirmDeleteId || isDeleting || !isAdmin) return;
    
    const id = confirmDeleteId;
    setIsDeleting(id);
    
    try {
      const docRef = db.collection("subscriptions").doc(id);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        const snapshotMemberName = getMemberName(data?.memberId);
        
        await trashCol.add({
          originalId: id,
          type: 'subscription',
          data: { 
            ...data, 
            id,
            snapshotMemberName: snapshotMemberName 
          },
          deletedAt: new Date().toISOString()
        });
        await docRef.delete();
        if (addNotification) addNotification('info', 'রেকর্ড ডিলিট', 'রেকর্ডটি রিসাইকেল বিনে পাঠানো হয়েছে।');
      }
      setConfirmDeleteId(null);
    } catch (error: any) {
      alert(`ডিলিট করা যায়নি। এরর: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchQuote = async (memberName: string) => {
    setLoadingQuote(true);
    try {
      const quote = await getMotivationalQuote(memberName);
      setReceiptQuote(quote);
    } catch (e) {
      setReceiptQuote("আপনার এই অবদান গ্রামের নিরাপত্তায় মাইলফলক হয়ে থাকবে।");
    }
    setLoadingQuote(false);
  };

  const getBengaliMonthName = (monthStr: string) => {
    const [year, monthPart] = monthStr.split('-');
    const months: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
      '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
      '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    return months[monthPart] ? `${months[monthPart]} ${year}` : monthStr;
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedMember('');
    setMemberSearchTerm('');
    setAmount(0);
    setReceivedBy('কাউছার');
    setCustomDate(new Date().toLocaleDateString('bn-BD'));
  };

  // Check for duplicate entry based on MemberID + Month
  const isDuplicateSelection = useMemo(() => {
    if (!selectedMember) return false;
    return subscriptions.some(s => 
      s.memberId === selectedMember && 
      s.month === month && 
      s.id !== editingId
    );
  }, [selectedMember, month, subscriptions, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!selectedMember || amount <= 0) {
      alert("দয়া করে সদস্য এবং টাকার পরিমাণ সঠিকভাবে দিন।");
      return;
    }

    // STRICT duplicate prevention
    if (isDuplicateSelection) {
      alert(`দুঃখিত! এই সদস্য (${getMemberName(selectedMember)}) আগেই ${getBengaliMonthName(month)} মাসের চাঁদা পরিশোধ করেছেন।\n\nএকই মাসে একই সদস্যের দুইবার এন্ট্রি নেওয়া যাবে না।`);
      return;
    }

    const customDocId = `${selectedMember}_${month}`;

    try {
      // Milestone Calculation Logic
      if (!editingId && addNotification) {
         const currentTotal = subscriptions
            .filter(s => s.memberId === selectedMember)
            .reduce((sum, s) => sum + s.amount, 0);
         
         const newTotal = currentTotal + amount;
         const milestone = 5000;

         // Check if a 5000 BDT milestone is crossed
         if (Math.floor(newTotal / milestone) > Math.floor(currentTotal / milestone)) {
           const milestoneAmount = Math.floor(newTotal / milestone) * milestone;
           addNotification(
             'success', 
             'অভিনন্দন! বিশেষ মাইলফলক', 
             `${getMemberName(selectedMember)} মোট ${milestoneAmount.toLocaleString()} টাকার মাইলফলক স্পর্শ করেছেন!`
           );
         }
      }

      const subData = { 
        memberId: selectedMember, 
        amount, 
        month, 
        date: editingId ? customDate : new Date().toLocaleDateString('bn-BD'), 
        receivedBy: receivedBy || 'কাউছার', 
        receiptNo: editingId && lastReceipt ? lastReceipt.receiptNo : `RCP-${month.replace('-', '')}-${selectedMember.slice(-3).toUpperCase()}` 
      };

      const docRef = db.collection("subscriptions").doc(editingId || customDocId);
      await docRef.set(subData, { merge: true });
      
      const savedSub = { id: editingId || customDocId, ...subData } as Subscription;
      
      if (!editingId) {
        setLastReceipt(savedSub);
        fetchQuote(getMemberName(selectedMember));
        setIsReceiptOpen(true);
        if (addNotification) addNotification('success', 'চাঁদা জমা হয়েছে', 'নতুন কালেকশন সফলভাবে এন্ট্রি হয়েছে।');
      } else {
        if (addNotification) addNotification('success', 'সংশোধন সফল', 'রেকর্ডটি আপডেট করা হয়েছে।');
      }

      handleCancelEdit();
      onClearPreSelection?.();
    } catch (err) { alert("সেভ করতে সমস্যা হয়েছে।"); }
  };

  const startEdit = (sub: Subscription) => {
    if (!isAdmin) return;
    setEditingId(sub.id);
    setSelectedMember(sub.memberId);
    setMemberSearchTerm(getMemberName(sub.memberId));
    setAmount(sub.amount);
    setMonth(sub.month);
    setReceivedBy(sub.receivedBy);
    setCustomDate(sub.date);
    setLastReceipt(sub);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const downloadReceipt = async () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 3, 
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.download = `Receipt-${lastReceipt?.receiptNo || 'RCP'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('রশিদ ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsDownloading(false);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />;
  };

  const paidMemberIds = useMemo(() => {
    const ids = new Set<string>();
    subscriptions.forEach(s => {
      if (s.month === month && s.id !== editingId) {
        ids.add(s.memberId);
      }
    });
    return ids;
  }, [subscriptions, month, editingId]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
       const searchLower = memberSearchTerm.toLowerCase();
       const matchesSearch = m.name.toLowerCase().includes(searchLower) ||
                             m.houseName.toLowerCase().includes(searchLower);
       const isPaid = paidMemberIds.has(m.id);
       return matchesSearch && !isPaid;
    });
  }, [members, memberSearchTerm, paidMemberIds]);

  return (
    <div className="space-y-10">
      {/* Form Section - Only visible to Admins */}
      {isAdmin ? (
        <div className="relative no-print">
          <div className="absolute inset-0 bg-emerald-600 h-32 rounded-[3rem] -z-10 opacity-10"></div>
          <div className={`bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-2 max-w-4xl mx-auto transition-all ${editingId ? 'border-blue-500 ring-4 ring-blue-50' : 'border-emerald-50 shadow-emerald-100/50'}`}>
            <div className="flex flex-col items-center text-center mb-10">
              <div className={`w-20 h-20 text-white rounded-3xl flex items-center justify-center shadow-xl mb-4 transition-colors ${editingId ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                <Banknote size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                {editingId ? 'চাঁদা এন্ট্রি সংশোধন' : 'চাঁদা জমা ফরম'}
              </h2>
              <p className={`${editingId ? 'text-blue-600' : 'text-emerald-600'} font-bold mt-1 uppercase tracking-widest text-xs`}>
                {editingId ? 'বিদ্যমান রেকর্ড আপডেট করুন' : 'কালেকশন ডাটাবেজ আপডেট করুন'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Form inputs retained as is */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-widest px-2">
                  <Calendar size={14} className={editingId ? 'text-blue-500' : 'text-emerald-500'} /> চাঁদার মাস
                </label>
                <input 
                  type="month" 
                  min={MIN_MONTH} 
                  className={`w-full p-5 bg-white border border-gray-200 rounded-[1.5rem] font-bold text-gray-800 outline-none transition-all shadow-inner focus:ring-2 ${editingId ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'}`} 
                  value={month} 
                  onChange={e => setMonth(e.target.value)} 
                />
              </div>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-widest px-2">
                  <User size={14} className={editingId ? 'text-blue-500' : 'text-emerald-500'} /> সদস্য নির্বাচন
                </label>
                <div className="relative group">
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="নাম অথবা বাড়ি..." 
                    className={`w-full p-5 bg-white border border-gray-200 rounded-[1.5rem] font-bold text-gray-800 outline-none transition-all shadow-inner pl-12 pr-12 focus:ring-2 ${editingId ? 'focus:ring-blue-500' : (isDuplicateSelection ? 'border-rose-300 bg-rose-50' : 'focus:ring-emerald-500')}`} 
                    value={memberSearchTerm} 
                    onChange={e => {
                      setMemberSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedMember) setSelectedMember('');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown size={20} className={isDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                </div>
                
                {isDropdownOpen && (
                  <div className={`absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-[1.5rem] shadow-2xl z-[100] max-h-72 overflow-y-auto p-2 border-t-4 ${editingId ? 'border-t-blue-500' : 'border-t-emerald-500'}`}>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map(m => (
                        <button key={m.id} type="button" className={`w-full text-left px-5 py-4 rounded-xl mb-1 flex justify-between items-center transition-all ${selectedMember === m.id ? (editingId ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white') : 'hover:bg-emerald-50 text-gray-700'}`} onClick={() => { setSelectedMember(m.id); setMemberSearchTerm(m.name); setIsDropdownOpen(false); setTimeout(() => amountRef.current?.focus(), 100); }}>
                          <div>
                            <div className="font-black text-base">{m.name}</div>
                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${selectedMember === m.id ? 'text-white opacity-80' : 'text-gray-500'}`}>
                              <Home size={10} /> {m.houseName}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm font-bold">
                        {memberSearchTerm ? 'কোনো সদস্য পাওয়া যায়নি' : 'এই মাসের জন্য সব সদস্যের চাঁদা পরিশোধিত!'}
                      </div>
                    )}
                  </div>
                )}

                {selectedMember && (
                  <div className={`mt-4 p-4 border rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${isDuplicateSelection ? 'bg-rose-50 border-rose-200' : (editingId ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100')}`}>
                    <div className={`w-12 h-12 text-white rounded-xl flex items-center justify-center ${isDuplicateSelection ? 'bg-rose-500' : (editingId ? 'bg-blue-600' : 'bg-emerald-600')}`}>
                      {isDuplicateSelection ? <AlertOctagon size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-black text-gray-900 leading-tight">{getMemberName(selectedMember)}</h4>
                      {isDuplicateSelection ? (
                        <p className="text-xs font-black text-rose-600 flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} /> এই মাসের টাকা পরিশোধিত!
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                          <MapPin size={12} className="text-rose-500" /> {getMemberHouse(selectedMember)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-widest px-2">
                  <UserCheck size={14} className={editingId ? 'text-blue-500' : 'text-emerald-500'} /> আদায়কারী
                </label>
                <input 
                  type="text" 
                  placeholder="আদায়কারীর নাম"
                  className={`w-full p-5 bg-white border border-gray-200 rounded-[1.5rem] font-bold text-gray-800 outline-none transition-all shadow-inner focus:ring-2 ${editingId ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'}`} 
                  value={receivedBy} 
                  onChange={e => setReceivedBy(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-widest px-2">
                  <CircleDollarSign size={14} className={editingId ? 'text-blue-500' : 'text-emerald-500'} /> টাকার পরিমাণ
                </label>
                <div className="relative">
                  <span className={`absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black ${editingId ? 'text-blue-300' : 'text-emerald-300'}`}>৳</span>
                  <input 
                    ref={amountRef}
                    type="number" 
                    placeholder="0.00" 
                    className={`w-full p-5 border-2 rounded-[1.5rem] font-black text-3xl outline-none transition-all pl-14 text-center shadow-lg bg-white ${editingId ? 'border-blue-100 focus:border-blue-500 text-blue-700' : 'border-emerald-100 focus:border-emerald-500 text-emerald-700'}`} 
                    value={amount || ''} 
                    onChange={e => setAmount(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col md:flex-row gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={!selectedMember || amount <= 0 || isDuplicateSelection} 
                  className={`
                    flex-1 py-5 rounded-[1.5rem] font-black text-xl transition-all duration-200
                    flex items-center justify-center gap-3 shadow-xl relative overflow-hidden group
                    disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none disabled:border-none
                    ${editingId 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 border-b-[6px] border-blue-900 active:border-b-0 active:translate-y-1' 
                      : (isDuplicateSelection 
                          ? 'bg-rose-100 text-rose-400 border-none cursor-not-allowed' 
                          : 'bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1 border-b-[6px] border-emerald-900 active:border-b-0 active:translate-y-1')
                    }
                  `}
                >
                  <div className={`absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-[1.5rem] ${isDuplicateSelection ? 'hidden' : ''}`}></div>
                  <span className="relative flex items-center gap-3 drop-shadow-md">
                    {isDuplicateSelection 
                      ? <><AlertOctagon size={26} strokeWidth={3} /> এন্ট্রি সম্ভব নয় (পেইড)</> 
                      : (editingId ? <><CheckCircle2 size={26} strokeWidth={3} /> তথ্য আপডেট করুন</> : <><CheckCircle2 size={26} strokeWidth={3} /> জমা নিশ্চিত করুন</>)
                    }
                  </span>
                </button>
                
                {editingId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEdit} 
                    className="flex-1 py-6 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black text-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3"
                  >
                    <XCircle size={24} /> বাতিল করুন
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-8 text-center border-2 border-emerald-50 shadow-sm no-print">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
             <Lock size={32} />
           </div>
           <h2 className="text-xl font-black text-gray-800">ভিউ অনলি মোড</h2>
           <p className="text-gray-500 mt-2">নতুন চাঁদা এন্ট্রি করতে দয়া করে অ্যাডমিন হিসেবে লগইন করুন।</p>
        </div>
      )}

      {/* Record Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="p-8 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">চাঁদা আদায়ের রেকর্ড</h3>
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest border border-gray-300 px-3 py-1 rounded-full bg-white">সর্বশেষ তালিকা</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-black text-gray-600 uppercase tracking-widest border-b border-gray-200">
              <tr>
                <th className="px-8 py-5 cursor-pointer" onClick={() => handleSort('memberName')}>নাম ও বাড়ি <SortIcon column="memberName" /></th>
                <th className="px-8 py-5 cursor-pointer" onClick={() => handleSort('month')}>চাঁদার মাস <SortIcon column="month" /></th>
                <th className="px-8 py-5 text-center cursor-pointer" onClick={() => handleSort('amount')}>পরিমাণ <SortIcon column="amount" /></th>
                <th className="px-8 py-5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSubscriptions.map(sub => (
                <tr key={sub.id} className={`transition-all ${editingId === sub.id ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : 'hover:bg-gray-50/80'}`}>
                  <td className="px-8 py-5">
                    <div className="font-black text-gray-900 text-lg leading-tight">{getMemberName(sub.memberId)}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">{getMemberHouse(sub.memberId)}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-xs font-black px-4 py-1.5 rounded-full uppercase ${editingId === sub.id ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                      {getBengaliMonthName(sub.month)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center font-black text-2xl text-emerald-800 tracking-tighter">৳{sub.amount.toLocaleString()}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setLastReceipt(sub); setIsReceiptOpen(true); fetchQuote(getMemberName(sub.memberId)); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"><Printer size={20} /></button>
                      
                      {isAdmin ? (
                        <>
                          <button onClick={() => startEdit(sub)} className={`p-3 rounded-xl transition-all shadow-sm border ${editingId === sub.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'}`}><Edit2 size={20} /></button>
                          <button onClick={() => setConfirmDeleteId(sub.id)} disabled={isDeleting === sub.id} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100">
                            {isDeleting === sub.id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                          </button>
                        </>
                      ) : (
                        <div className="p-3 opacity-30">
                          <Lock size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedSubscriptions.length === 0 && (
            <div className="p-32 text-center text-gray-400 font-bold italic uppercase tracking-widest text-sm">কোনো চাঁদার রেকর্ড পাওয়া যায়নি</div>
          )}
        </div>
      </div>

      {/* --- CONFIRM DELETE MODAL --- */}
      {confirmDeleteId && isAdmin && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">চাঁদা রেকর্ড মুছে ফেলতে চান?</h3>
              <p className="text-gray-500 font-medium text-sm mb-8">
                চিন্তা করবেন না, এটি চিরতরে মুছে যাবে না। এটি <span className="text-rose-600 font-bold">রিসাইকেল বিনে</span> জমা থাকবে, যেখান থেকে আপনি চাইলে আবার ফিরিয়ে আনতে পারবেন।
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmDeleteId(null)} 
                  disabled={!!isDeleting}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> বাতিল
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={!!isDeleting}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-sm hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RECEIPT MODAL (Screen View) --- */}
      {isReceiptOpen && lastReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-[300] no-print overflow-y-auto">
           <div className="bg-white rounded-[1.5rem] w-full max-w-sm shadow-2xl overflow-hidden relative animate-in zoom-in duration-300 my-4">
            <div className="absolute top-4 right-4 flex gap-2 no-print">
              <button 
                onClick={downloadReceipt} 
                disabled={isDownloading}
                className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5 font-black uppercase text-[10px] tracking-widest disabled:bg-gray-400"
              >
                {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isDownloading ? 'প্রসেসিং...' : 'ডাউনলোড PNG'}
              </button>
              <button onClick={() => window.print()} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5 font-black uppercase text-[10px] tracking-widest"><Printer size={16} /> প্রিন্ট</button>
              <button onClick={() => setIsReceiptOpen(false)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors">✕</button>
            </div>

            <div id="printable-receipt" className="p-6 space-y-3 bg-white border-[6px] border-emerald-50 m-1.5 rounded-[1rem] flex flex-col">
              {/* Screen Receipt Content (Same as previous, just kept for screen view) */}
              <div className="text-center space-y-1.5 border-b border-emerald-600/30 pb-3">
                <div className="flex justify-center mb-0.5">
                  <ShieldCheck size={32} className="text-emerald-700" strokeWidth={2.5} />
                </div>
                <h1 className="text-base font-black text-emerald-900 tracking-tight leading-none uppercase">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] font-black text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full uppercase border border-emerald-100">আর্থিক সহযোগিতায় কালিপুর প্রবাসীগন</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">{FIXED_ADDRESS}</span>
                </div>
              </div>

              <div className="space-y-2.5 py-1">
                <div className="flex justify-between items-center text-[9px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-100 pb-1">
                  <span>নং: {lastReceipt.receiptNo}</span>
                  <span>তারিখ: {lastReceipt.date}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-0.5">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">সদস্যের নাম</span>
                    <span className="text-sm font-black text-gray-900 leading-none">{getMemberName(lastReceipt.memberId)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-0.5">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">বাড়ির নাম</span>
                    <span className="text-[10px] font-bold text-gray-800 leading-none">{getMemberHouse(lastReceipt.memberId)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-0.5">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">চাঁদার মাস</span>
                    <span className="text-xs font-black text-emerald-700 leading-none">{getBengaliMonthName(lastReceipt.month)}</span>
                  </div>
                </div>

                <div className="bg-emerald-600 text-white rounded-lg p-3 text-center shadow-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">পরিশোধিত চাঁদা</p>
                  <p className="text-2xl font-black tracking-tighter leading-none">৳{lastReceipt.amount.toLocaleString()}</p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 relative">
                  <Quote size={14} className="absolute -top-1.5 -left-1 text-amber-200" />
                  {loadingQuote ? (
                    <div className="flex justify-center py-1"><Loader2 className="animate-spin text-amber-300" size={12} /></div>
                  ) : (
                    <p className="text-center font-medium text-amber-900 italic text-[10px] leading-snug">
                      "{receiptQuote}"
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-center items-end border-t border-gray-100 mt-0.5">
                <div className="text-center">
                  <div className="signature-font text-xl text-emerald-800 -mb-1 select-none pointer-events-none opacity-90 rotate-[-2deg]">
                    {lastReceipt.receivedBy || 'Kawsar'}
                  </div>
                  <div className="w-24 h-px bg-gray-300 mx-auto mb-1"></div>
                  <p className="text-[8px] font-black text-emerald-800 uppercase tracking-wider">আদায়কারী ({lastReceipt.receivedBy || 'কাউছার'})</p>
                </div>
              </div>

              <div className="text-center pt-2 mt-0.5 border-t border-gray-50/50">
                 <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.1em] slogan-fix leading-none">
                    নিরাপদ কালিপুর গড়ার লক্ষে — আপনার আমানত আমাদের দায়িত্ব
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT ONLY LAYOUT (Hidden on screen, block on print) --- */}
      {lastReceipt && (
        <div className="hidden print:block fixed inset-0 bg-white z-[1000] p-8">
            <div className="border-[3px] border-black p-8 h-full rounded-2xl relative">
                {/* Watermark - Lighter opacity for better print contrast */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <ShieldCheck size={400} />
                </div>

                <div className="text-center mb-8 border-b-[3px] border-double border-black pb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <ShieldCheck size={48} className="text-black" />
                        <h1 className="text-4xl font-black text-black uppercase">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
                    </div>
                    <p className="text-lg font-bold text-gray-600">{FIXED_ADDRESS}</p>
                    <div className="inline-block mt-4 px-6 py-1 border-2 border-black bg-gray-100 text-black rounded-full text-sm font-bold uppercase tracking-widest">টাকা জমার রশিদ</div>
                </div>

                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <p className="font-bold text-gray-600">রশিদ নং:</p>
                        <p className="font-black text-xl text-black">{lastReceipt.receiptNo}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="font-bold text-gray-600">তারিখ:</p>
                        <p className="font-black text-xl text-black">{lastReceipt.date}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex border-b border-gray-300 pb-2">
                        <div className="w-1/3 font-bold text-gray-600 text-lg uppercase">সদস্যের নাম</div>
                        <div className="w-2/3 font-black text-black text-2xl">{getMemberName(lastReceipt.memberId)}</div>
                    </div>
                    <div className="flex border-b border-gray-300 pb-2">
                        <div className="w-1/3 font-bold text-gray-600 text-lg uppercase">বাড়ির নাম</div>
                        <div className="w-2/3 font-bold text-black text-xl">{getMemberHouse(lastReceipt.memberId)}</div>
                    </div>
                    <div className="flex border-b border-gray-300 pb-2">
                        <div className="w-1/3 font-bold text-gray-600 text-lg uppercase">চাঁদার মাস</div>
                        <div className="w-2/3 font-bold text-black text-xl">{getBengaliMonthName(lastReceipt.month)}</div>
                    </div>
                    <div className="flex border-b border-gray-300 pb-2 items-center">
                        <div className="w-1/3 font-bold text-gray-600 text-lg uppercase">টাকার পরিমাণ</div>
                        <div className="w-2/3 font-black text-black text-4xl">৳{lastReceipt.amount.toLocaleString()}</div>
                    </div>
                </div>

                <div className="mt-12 bg-gray-50 p-6 rounded-xl border border-gray-200 text-center relative italic text-gray-700 text-lg font-medium">
                    <Quote size={24} className="absolute top-4 left-4 text-gray-300" />
                    "{receiptQuote || "আপনার এই দান সদকায়ে জারিয়া হিসেবে কবুল হোক।"}"
                </div>

                <div className="flex justify-between items-end mt-24 px-12 break-inside-avoid">
                    <div className="text-center">
                        <div className="w-48 border-t-2 border-black mb-2"></div>
                        <p className="font-bold text-gray-600">সদস্যের স্বাক্ষর</p>
                    </div>
                    <div className="text-center relative">
                        {/* Digital Signature Simulation - Improved contrast for print */}
                        <div className="signature-font text-3xl text-black absolute bottom-8 left-0 right-0 opacity-80 rotate-[-5deg]">
                           {lastReceipt.receivedBy || 'Kawsar'}
                        </div>
                        <div className="w-48 border-t-2 border-black mb-2 relative z-10"></div>
                        <p className="font-bold text-gray-600">আদায়কারীর স্বাক্ষর ({lastReceipt.receivedBy || 'কাউছার'})</p>
                    </div>
                </div>

                <div className="absolute bottom-6 left-0 right-0 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                    সফটওয়্যার ও কারিগরি সহযোগিতায়: কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManager;