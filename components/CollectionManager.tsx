
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Member, Subscription, AppNotification } from '../types';
import { Printer, Banknote, Edit2, Trash2, Search, ChevronDown, ChevronUp, Loader2, Calendar, User, CircleDollarSign, CheckCircle2, ShieldCheck, Quote, Home, MapPin, UserCheck, XCircle, Download, AlertTriangle, AlertOctagon, Lock, Send, RotateCcw } from 'lucide-react';
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

    if (isDuplicateSelection) {
      alert(`দুঃখিত! এই সদস্য আগেই এই মাসের চাঁদা পরিশোধ করেছেন।`);
      return;
    }

    const customDocId = `${selectedMember}_${month}`;

    try {
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
      const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.download = `Receipt-${lastReceipt?.receiptNo}.png`;
      link.href = image;
      link.click();
    } catch (err) { alert('রশিদ ডাউনলোড করতে সমস্যা হয়েছে।'); }
    finally { setIsDownloading(false); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />;
  };

  const paidMemberIds = useMemo(() => {
    const ids = new Set<string>();
    subscriptions.forEach(s => { if (s.month === month && s.id !== editingId) ids.add(s.memberId); });
    return ids;
  }, [subscriptions, month, editingId]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
       const searchLower = memberSearchTerm.toLowerCase();
       const matchesSearch = m.name.toLowerCase().includes(searchLower) || m.houseName.toLowerCase().includes(searchLower);
       const isPaid = paidMemberIds.has(m.id);
       return matchesSearch && !isPaid;
    });
  }, [members, memberSearchTerm, paidMemberIds]);

  return (
    <div className="space-y-10">
      {/* Form Section */}
      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-2 border-emerald-50 max-w-4xl mx-auto no-print">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center shadow-xl mb-4">
                <Banknote size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">{editingId ? 'সংশোধন' : 'চাঁদা জমা ফরম'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase px-2">চাঁদার মাস</label>
                <input type="month" min={MIN_MONTH} className="w-full p-5 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={month} onChange={e => setMonth(e.target.value)} />
              </div>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-xs font-black text-gray-500 uppercase px-2">সদস্য নির্বাচন</label>
                <div className="relative">
                  <input type="text" placeholder="নাম অথবা বাড়ি..." className="w-full p-5 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all pl-12" value={memberSearchTerm} onChange={e => { setMemberSearchTerm(e.target.value); setIsDropdownOpen(true); if (selectedMember) setSelectedMember(''); }} onFocus={() => setIsDropdownOpen(true)} />
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100] max-h-72 overflow-y-auto p-2">
                    {filteredMembers.map(m => (
                      <button key={m.id} type="button" className="w-full text-left px-5 py-4 rounded-xl mb-1 hover:bg-emerald-50" onClick={() => { setSelectedMember(m.id); setMemberSearchTerm(m.name); setIsDropdownOpen(false); }}>
                        <div className="font-black text-base">{m.name}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase">{m.houseName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase px-2">টাকার পরিমাণ</label>
                <input type="number" placeholder="৳" className="w-full p-5 border-2 border-emerald-100 rounded-2xl font-black text-3xl outline-none text-center focus:border-emerald-500 text-emerald-700" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
              </div>

              <div className="md:col-span-2">
                <button type="submit" disabled={!selectedMember || amount <= 0 || isDuplicateSelection} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                  <Send size={24} /> জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
        </div>
      )}

      {/* Record Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-black text-gray-600 uppercase tracking-widest border-b border-gray-200">
              <tr>
                <th className="px-8 py-5">নাম ও বাড়ি</th>
                <th className="px-8 py-5">চাঁদার মাস</th>
                <th className="px-8 py-5 text-center">পরিমাণ</th>
                <th className="px-8 py-5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSubscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50/80 transition-all">
                  <td className="px-8 py-5">
                    <div className="font-black text-gray-900 text-lg">{getMemberName(sub.memberId)}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase mt-0.5">{getMemberHouse(sub.memberId)}</div>
                  </td>
                  <td className="px-8 py-5"><span className="text-xs font-black px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800">{getBengaliMonthName(sub.month)}</span></td>
                  <td className="px-8 py-5 text-center font-black text-2xl text-emerald-800">৳{sub.amount.toLocaleString()}</td>
                  <td className="px-8 py-5 text-right flex justify-end gap-3">
                    <button onClick={() => { setLastReceipt(sub); setIsReceiptOpen(true); fetchQuote(getMemberName(sub.memberId)); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Printer size={20} /></button>
                    {isAdmin && (
                      <button onClick={() => setConfirmDeleteId(sub.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={20} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RECEIPT ENGINE (PRINT & SCREEN) --- */}
      {isReceiptOpen && lastReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-[300] no-print overflow-y-auto">
           <div className="bg-white rounded-[1.5rem] w-full max-w-sm shadow-2xl overflow-hidden relative animate-in zoom-in duration-300 my-4">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={downloadReceipt} disabled={isDownloading} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><Download size={16} /></button>
              <button onClick={() => window.print()} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><Printer size={16} /></button>
              <button onClick={() => setIsReceiptOpen(false)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors">✕</button>
            </div>

            <div id="printable-receipt" className="p-6 space-y-4 bg-white border-[8px] border-emerald-50 m-2 rounded-[1rem]">
              <div className="text-center space-y-1.5 border-b-2 border-emerald-600/20 pb-4">
                <ShieldCheck size={40} className="text-emerald-700 mx-auto" />
                <h1 className="text-lg font-black text-emerald-900 leading-none">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{FIXED_ADDRESS}</p>
              </div>

              <div className="space-y-3.5 py-2">
                <div className="flex justify-between text-[10px] font-black text-gray-600 uppercase border-b border-gray-100 pb-2">
                  <span>নং: {lastReceipt.receiptNo}</span>
                  <span>তারিখ: {lastReceipt.date}</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase">সদস্যের নাম</span>
                    <span className="font-black text-gray-900">{getMemberName(lastReceipt.memberId)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase">বাড়ির নাম</span>
                    <span className="font-bold text-gray-800">{getMemberHouse(lastReceipt.memberId)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-gray-100 pb-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase">চাঁদার মাস</span>
                    <span className="font-black text-emerald-700">{getBengaliMonthName(lastReceipt.month)}</span>
                  </div>
                </div>

                <div className="bg-emerald-600 text-white rounded-xl p-4 text-center shadow-lg">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">পরিশোধিত চাঁদা</p>
                  <p className="text-3xl font-black tracking-tighter">৳{lastReceipt.amount.toLocaleString()}</p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center relative italic text-[11px] leading-relaxed text-amber-900 font-medium">
                  <Quote size={16} className="absolute top-2 left-2 text-amber-200" />
                  "{receiptQuote || "আপনার অবদান গ্রামের নিরাপত্তায় সংরক্ষিত থাকবে।"}"
                </div>
              </div>

              <div className="pt-8 flex justify-center border-t border-gray-100">
                <div className="text-center">
                  <div className="signature-font text-2xl text-emerald-800 -mb-1">{lastReceipt.receivedBy || 'Kawsar'}</div>
                  <div className="w-28 h-px bg-black mx-auto mb-1"></div>
                  <p className="text-[9px] font-black text-emerald-800 uppercase">আদায়কারী স্বাক্ষর</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT ONLY VOUCHER --- */}
      <div className="print-only">
         <div className="border-[4px] border-black p-10 m-4 h-[120mm] rounded-[1rem] flex flex-col relative">
            <div className="text-center border-b-2 border-black pb-6 mb-8">
              <ShieldCheck size={64} className="mx-auto mb-2" />
              <h1 className="text-3xl font-black uppercase">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
              <p className="text-sm font-bold tracking-[0.3em] uppercase">{FIXED_ADDRESS}</p>
              <div className="inline-block mt-4 px-6 py-1 border-2 border-black bg-gray-100 rounded-full font-black uppercase text-sm">টাকা জমার রশিদ</div>
            </div>

            <div className="flex justify-between mb-10 text-lg font-bold">
               <span>রশিদ নং: {lastReceipt?.receiptNo}</span>
               <span>তারিখ: {lastReceipt?.date}</span>
            </div>

            <div className="space-y-6 flex-1">
               <div className="flex border-b border-black pb-2 items-end">
                  <span className="w-40 font-bold uppercase text-gray-600">সদস্যের নাম:</span>
                  <span className="flex-1 text-2xl font-black ml-4">{lastReceipt ? getMemberName(lastReceipt.memberId) : ''}</span>
               </div>
               <div className="flex border-b border-black pb-2 items-end">
                  <span className="w-40 font-bold uppercase text-gray-600">বাড়ির নাম:</span>
                  <span className="flex-1 text-xl font-bold ml-4">{lastReceipt ? getMemberHouse(lastReceipt.memberId) : ''}</span>
               </div>
               <div className="flex border-b border-black pb-2 items-end">
                  <span className="w-40 font-bold uppercase text-gray-600">চাঁদার মাস:</span>
                  <span className="flex-1 text-xl font-black ml-4">{lastReceipt ? getBengaliMonthName(lastReceipt.month) : ''}</span>
               </div>
               <div className="flex border-b-2 border-black py-4 items-center justify-between">
                  <span className="text-xl font-black uppercase">জমার পরিমাণ:</span>
                  <span className="text-4xl font-black">৳ {lastReceipt?.amount.toLocaleString()} /-</span>
               </div>
            </div>

            <div className="mt-12 flex justify-between items-end px-10">
               <div className="text-center">
                  <div className="w-48 border-t-2 border-black mb-2"></div>
                  <p className="font-bold text-sm uppercase">সদস্যের স্বাক্ষর</p>
               </div>
               <div className="text-center">
                  <div className="signature-font text-3xl mb-1">{lastReceipt?.receivedBy}</div>
                  <div className="w-48 border-t-2 border-black mb-2"></div>
                  <p className="font-bold text-sm uppercase">আদায়কারী স্বাক্ষর</p>
               </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-bold text-gray-500 uppercase">
              নিরাপদ কালিপুর গড়ার লক্ষে — কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম
            </div>
         </div>
      </div>
    </div>
  );
};

export default CollectionManager;
