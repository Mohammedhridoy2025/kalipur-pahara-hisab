
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Member, Subscription } from '../types';
import { Plus, Search, Edit2, ChevronDown, ChevronUp, Wallet, Filter, UserCheck, UserMinus, Printer, ShieldCheck, Home, AlertCircle, XCircle, CheckCircle2, RefreshCw, Trash2, Loader2, Camera, Phone, Globe, Lock, User, ArrowDownUp, MapPin, Award, Calendar, CheckCircle, HelpCircle } from 'lucide-react';
import { membersCol, trashCol, db } from '../services/firebase';

interface MemberManagerProps {
  members: Member[];
  subscriptions: Subscription[];
  setMembers: (m: Member[]) => void;
  initialOpen?: boolean;
  onCloseModal?: () => void;
  onAddSubscription?: (memberId: string) => void;
  isAdmin: boolean;
}

const FIXED_ADDRESS = "কালিপুর, হোমনা, কুমিল্লা";
const DEFAULT_PHOTO = "https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-user-profile-avatar-png-image_10211467.png";
const MIN_MONTH = "2024-01";

const COUNTRY_OPTIONS = [
  "সৌদি আরব", "সংযুক্ত আরব আমিরাত", "ওমান", "মালয়েশিয়া", "কাতার", "কুয়েত", "সিঙ্গাপুর",
  "যুক্তরাজ্য (ব্রিটেন)", "イতালি", "পর্তুগাল", "গ্রিস", "ফ্রান্স", "স্পেন", "জার্মানি", "রোমানিয়া",
  "যুক্তরাষ্ট্র (আমেরিকা)", "কানাডা", "অস্ট্রেলিয়া", "দক্ষিণ কোরিয়া", "বাহরাইন", "জর্ডান", "মালদ্বীপ", "লেবানন", "ব্রুনাই", "জাপান", "দক্ষিণ আফ্রিকা"
];

type SortKey = 'name' | 'houseName' | 'country' | 'totalContribution' | 'status';
type PaymentFilter = 'all' | 'paid' | 'unpaid';

const MemberManager: React.FC<MemberManagerProps> = ({ members, subscriptions, initialOpen, onCloseModal, onAddSubscription, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(initialOpen || false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [sortConfig, setSortConfig] = useState<{key: SortKey, direction: 'asc' | 'desc'}>({ key: 'name', direction: 'asc' });
  
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Member>>({
    name: '', houseName: '', mobile: '', country: '', status: 'active', photoUrl: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMemberTotalContribution = (memberId: string) => {
    return subscriptions
      .filter(s => s.memberId === memberId)
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const isMemberPaidForMonth = (memberId: string, month: string) => {
    return subscriptions.some(s => s.memberId === memberId && s.month === month);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SortKey;
    if (value === sortConfig.key) {
      setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
    } else {
      setSortConfig({ key: value, direction: 'asc' });
    }
  };

  const sortedMembers = useMemo(() => {
    let items = [...members].filter(m => {
      const matchesSearch = m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.houseName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      
      const isPaid = isMemberPaidForMonth(m.id, selectedMonth);
      const matchesPayment = paymentFilter === 'all' || 
                             (paymentFilter === 'paid' && isPaid) || 
                             (paymentFilter === 'unpaid' && !isPaid);

      return matchesSearch && matchesStatus && matchesPayment;
    });

    items.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Member] || '';
      let valB: any = b[sortConfig.key as keyof Member] || '';

      if (sortConfig.key === 'totalContribution') {
        valA = getMemberTotalContribution(a.id);
        valB = getMemberTotalContribution(b.id);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [members, searchTerm, statusFilter, paymentFilter, selectedMonth, sortConfig, subscriptions]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("ছবির সাইজ অনেক বড়! দয়া করে ৮০০ KB এর নিচে ছবি আপলোড করুন।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (editingMember) {
      setIsUpdateConfirmOpen(true);
    } else {
      await performSave();
    }
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const finalPhotoUrl = formData.photoUrl || (editingMember ? editingMember.photoUrl : DEFAULT_PHOTO);
      const finalData = {
        name: formData.name || '',
        houseName: formData.houseName || '',
        mobile: formData.mobile || '',
        country: formData.country || 'বাংলাদেশ',
        status: formData.status || 'active',
        photoUrl: finalPhotoUrl
      };
      if (editingMember) {
        await db.collection("members").doc(editingMember.id).set(finalData, { merge: true });
        setIsUpdateConfirmOpen(false);
      } else {
        await membersCol.add(finalData);
      }
      setIsModalOpen(false);
      setEditingMember(null);
      setFormData({ name: '', houseName: '', mobile: '', country: '', status: 'active', photoUrl: '' });
    } catch (err: any) {
      alert(`ডাটা সেভ করতে সমস্যা হয়েছে: ${err.message || "অজানা ত্রুটি"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !isAdmin) return;
    setIsDeleting(confirmDeleteId);
    try {
      const memberId = confirmDeleteId;
      const docRef = db.collection("members").doc(memberId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        await trashCol.add({
          originalId: memberId,
          type: 'member',
          data: { ...docSnap.data(), id: memberId }, 
          deletedAt: new Date().toISOString()
        });
        await docRef.delete();
      }
      setConfirmDeleteId(null);
    } catch (error: any) {
      alert(`ডিলিট করা যায়নি। এরর: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
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

  return (
    <div className="space-y-8">
      {/* Search and Advanced Action Bar */}
      <div className="flex flex-col space-y-4 no-print bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="সদস্য বা বাড়ি দিয়ে খুঁজুন..." 
              className="w-full pl-14 pr-6 py-4 border border-gray-200 rounded-2xl focus:border-emerald-500 outline-none font-bold text-gray-800 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             {/* Month Picker for Status Check */}
             <div className="relative flex-1 md:flex-none">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input 
                  type="month"
                  min={MIN_MONTH}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full md:w-44 pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 text-xs appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
                />
             </div>

             {/* Payment Filter */}
             <div className="relative flex-1 md:flex-none">
               <Wallet size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
               <select 
                 value={paymentFilter}
                 onChange={(e) => setPaymentFilter(e.target.value as any)}
                 className="w-full md:w-40 pl-11 pr-8 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 text-xs appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
               >
                 <option value="all">সব পেমেন্ট</option>
                 <option value="paid">পরিশোধিত</option>
                 <option value="unpaid">বকেয়া</option>
               </select>
               <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
             </div>

             {/* Member Status Filter */}
             <div className="relative flex-1 md:flex-none">
               <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
               <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value as any)}
                 className="w-full md:w-40 pl-11 pr-8 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 text-xs appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
               >
                 <option value="all">সব অবস্থা</option>
                 <option value="active">সক্রিয়</option>
                 <option value="inactive">নিষ্ক্রিয়</option>
               </select>
               <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2 border-t border-gray-50">
           <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
              <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">মোট: {sortedMembers.length} জন</span>
              <span>•</span>
              <span>মাস: {getBengaliMonthName(selectedMonth)}</span>
           </div>
           
           <div className="flex gap-3">
              <button 
                onClick={() => window.print()} 
                className="p-4 bg-gray-50 text-gray-700 rounded-2xl font-black text-sm hover:bg-emerald-50 transition-all border border-gray-200"
              >
                <Printer size={20} />
              </button>
              {isAdmin && (
                <button 
                  onClick={() => { setEditingMember(null); setFormData({ name: '', houseName: '', mobile: '', country: '', status: 'active', photoUrl: '' }); setIsModalOpen(true); }} 
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-emerald-600 transition-all active:scale-95 text-sm"
                >
                  <Plus size={20} /> সদস্য যোগ
                </button>
              )}
           </div>
        </div>
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
         {sortedMembers.map(member => {
           const total = getMemberTotalContribution(member.id);
           const isPaid = isMemberPaidForMonth(member.id, selectedMonth);
           return (
             <div key={member.id} className="group relative bg-white rounded-[2rem] overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                
                {/* Header Banner - Taller height to prevent overlap */}
                <div className="h-28 bg-emerald-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
                    
                    {/* CENTERED Payment Badge - Positioned at the very top */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-full flex justify-center">
                        <div className={`
                          flex items-center gap-2 px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] shadow-lg backdrop-blur-md border transition-all duration-300 group-hover:scale-105
                          ${isPaid 
                            ? 'bg-emerald-500/95 text-white border-white/30 shadow-emerald-900/20' 
                            : 'bg-rose-500/95 text-white border-white/30 shadow-rose-900/20'}
                        `}>
                           {isPaid ? <CheckCircle size={14} strokeWidth={3} /> : <AlertCircle size={14} strokeWidth={3} />}
                           {isPaid ? 'পরিশোধিত' : 'বকেয়া'}
                        </div>
                    </div>

                    {/* Top Actions */}
                    {isAdmin && (
                      <div className="absolute top-3 right-3 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                         <button 
                           onClick={() => { setEditingMember(member); setFormData(member); setIsModalOpen(true); }} 
                           className="p-1.5 bg-white/20 text-white hover:bg-white hover:text-emerald-700 rounded-lg backdrop-blur-md transition-all border border-white/30 shadow-sm"
                         >
                           <Edit2 size={14} />
                         </button>
                         <button 
                           onClick={() => setConfirmDeleteId(member.id)} 
                           disabled={isDeleting === member.id} 
                           className="p-1.5 bg-white/20 text-white hover:bg-rose-500 hover:text-white rounded-lg backdrop-blur-md transition-all border border-white/30 shadow-sm"
                         >
                           {isDeleting === member.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                         </button>
                      </div>
                    )}
                </div>

                <div className="relative -mt-10 px-6 flex justify-between items-end">
                    <div className="relative">
                         <div className="w-24 h-24 rounded-2xl border-[5px] border-white shadow-xl bg-white overflow-hidden relative group-hover:scale-110 transition-transform duration-500 z-10">
                             <img 
                               src={member.photoUrl || DEFAULT_PHOTO} 
                               className="w-full h-full object-cover" 
                               alt={member.name} 
                             />
                         </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider mb-2 border ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </div>
                </div>

                <div className="p-6 pt-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-gray-800 leading-tight mb-1 line-clamp-1">{member.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-5">
                         <Home size={12} className="text-emerald-500" /> 
                         {member.houseName}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col justify-center">
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">মোবাইল</p>
                             <p className="text-xs font-black text-gray-700 truncate">{member.mobile || 'নেই'}</p>
                         </div>
                         <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                             <p className="text-[10px] text-emerald-600/70 font-bold uppercase mb-0.5">মোট দান</p>
                             <p className="text-sm font-black text-emerald-700">৳{total.toLocaleString()}</p>
                         </div>
                    </div>

                    <div className="mt-auto">
                         {isAdmin ? (
                           <button 
                             onClick={() => onAddSubscription?.(member.id)} 
                             className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg active:scale-95"
                           >
                             <Wallet size={16} /> চাঁদা জমা নিন
                           </button>
                         ) : (
                            <div className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-not-allowed border border-gray-100">
                                <Lock size={12} /> শুধুমাত্র অ্যাডমিন
                            </div>
                         )}
                    </div>
                </div>
             </div>
           )
         })}
         
         {sortedMembers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                 <HelpCircle size={32} />
               </div>
               <p className="text-gray-400 font-bold">এই ফিল্টার অনুযায়ী কোনো সদস্য পাওয়া যায়নি</p>
            </div>
         )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[150] no-print">
           <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
              <XCircle size={24} />
            </button>
            <h3 className="text-3xl font-black text-gray-900 mb-8">{editingMember ? 'সদস্য তথ্য হালনাগাদ' : 'নতুন সদস্য নিবন্ধন'}</h3>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                     <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-xl overflow-hidden">
                         <img 
                           src={formData.photoUrl || (editingMember?.photoUrl || DEFAULT_PHOTO)} 
                           className="w-full h-full rounded-full object-cover"
                           alt="Profile"
                         />
                         <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                            <Camera size={24} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                         </label>
                     </div>
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-widest">প্রোফাইল ছবি</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">সদস্যের নাম</label>
                     <input type="text" placeholder="সদস্যের নাম..." className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-emerald-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">বাড়ির নাম</label>
                     <input type="text" placeholder="বাড়ির নাম..." className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-emerald-500" value={formData.houseName} onChange={e => setFormData({...formData, houseName: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">মোবাইল</label>
                     <input type="tel" placeholder="017..." className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-emerald-500" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                  <div className="space-y-2 relative" ref={countryDropdownRef}>
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">দেশ</label>
                     <input type="text" placeholder="দেশ..." className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:border-emerald-500" value={formData.country} onChange={e => {setFormData({...formData, country: e.target.value}); setIsCountryDropdownOpen(true);}} onFocus={() => setIsCountryDropdownOpen(true)} />
                     {isCountryDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto">
                          {COUNTRY_OPTIONS.map((c, i) => (
                            <button key={i} type="button" className="w-full text-left px-5 py-3 hover:bg-emerald-50 font-bold" onClick={() => {setFormData({...formData, country: c}); setIsCountryDropdownOpen(false);}}>{c}</button>
                          ))}
                        </div>
                     )}
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">অবস্থা</label>
                     <select className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                       <option value="active">সক্রিয়</option>
                       <option value="inactive">নিষ্ক্রিয়</option>
                     </select>
                  </div>
                </div>

                <button type="submit" disabled={isSaving} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                  {isSaving ? 'সেভ হচ্ছে...' : (editingMember ? 'তথ্য সংশোধন করুন' : 'নিবন্ধন করুন')}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {isUpdateConfirmOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[200] no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm shadow-2xl text-center animate-in zoom-in duration-300">
             <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                <Edit2 size={40} />
             </div>
             <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">সংশোধন নিশ্চিত করুন</h3>
             <p className="text-gray-500 font-medium mb-8 leading-relaxed">
               আপনি কি <span className="text-blue-600 font-black">"{editingMember?.name}"</span> এর সদস্য তথ্য আপডেট করতে নিশ্চিত?
             </p>
             <div className="flex flex-col gap-3">
                <button 
                  onClick={performSave} 
                  disabled={isSaving}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                   {isSaving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                   হ্যাঁ, আপডেট করুন
                </button>
                <button 
                  onClick={() => setIsUpdateConfirmOpen(false)} 
                  disabled={isSaving}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-xl font-black hover:bg-gray-100 transition-all"
                >
                   বাতিল
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && isAdmin && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] no-print">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-black text-gray-800 mb-2">সদস্য মুছে ফেলবেন?</h3>
              <p className="text-gray-500 text-sm mb-8 font-medium">রেকর্ডটি রিসাইকেল বিনে জমা হবে।</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black">বাতিল</button>
                <button onClick={handleDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black">হ্যাঁ, মুছুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REFACTORED PRINT ONLY LAYOUT --- */}
      <div className="print-only w-full">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center justify-center gap-3 mb-1">
             <ShieldCheck size={40} className="text-black" />
             <h1 className="text-3xl font-black text-black tracking-tighter uppercase">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
          </div>
          <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">{FIXED_ADDRESS}</p>
          <div className="inline-block mt-4 px-10 py-2 border-2 border-black bg-gray-50 rounded-full font-black text-lg uppercase">
            সক্রিয় সদস্য ও অবদানের তালিকা
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-bold text-gray-500 uppercase px-2">
             <span>রিপোর্ট আইডি: MEM-{new Date().getTime().toString().slice(-6)}</span>
             <span>তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
          </div>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-3 text-center w-12 text-xs font-black uppercase">নং</th>
              <th className="border border-black p-3 text-center w-20 text-xs font-black uppercase">ছবি</th>
              <th className="border border-black p-3 text-left text-xs font-black uppercase">সদস্যের নাম ও ঠিকানা</th>
              <th className="border border-black p-3 text-left text-xs font-black uppercase">বাড়ির নাম</th>
              <th className="border border-black p-3 text-right text-xs font-black uppercase">মোট অবদান (৳)</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member, idx) => {
              const total = getMemberTotalContribution(member.id);
              return (
                <tr key={member.id} className="border border-black">
                  <td className="border border-black p-3 text-center font-bold text-sm">{idx + 1}</td>
                  <td className="border border-black p-2 text-center">
                    <div className="w-14 h-14 rounded-full border border-gray-300 overflow-hidden mx-auto">
                      <img 
                        src={member.photoUrl || DEFAULT_PHOTO} 
                        className="w-full h-full object-cover" 
                        alt={member.name} 
                      />
                    </div>
                  </td>
                  <td className="border border-black p-3">
                    <div className="font-black text-base text-black">{member.name}</div>
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{member.country}</div>
                  </td>
                  <td className="border border-black p-3">
                    <div className="font-bold text-sm text-black">{member.houseName}</div>
                  </td>
                  <td className="border border-black p-3 text-right">
                    <div className="font-black text-lg text-black">৳ {total.toLocaleString()}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
             <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="border border-black p-4 text-right text-sm uppercase">সর্বমোট ফান্ড অবদান (নির্বাচিত তালিকা):</td>
                <td className="border border-black p-4 text-right text-xl">
                   ৳ {sortedMembers.reduce((sum, m) => sum + getMemberTotalContribution(m.id), 0).toLocaleString()}
                </td>
             </tr>
          </tfoot>
        </table>
        
        <div className="mt-24 flex justify-between px-16 break-inside-avoid">
          <div className="text-center">
            <div className="w-48 border-t-2 border-black mb-2"></div>
            <p className="text-xs font-black text-black uppercase tracking-widest">কোষাধ্যক্ষ</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-t-2 border-black mb-2"></div>
            <p className="text-xs font-black text-black uppercase tracking-widest">সভাপতি / সেক্রেটারি</p>
          </div>
        </div>

        <div className="fixed bottom-6 left-0 right-0 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] border-t border-gray-100 pt-4">
          রিপোর্ট জেনারেটেড বাই: কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম
        </div>
      </div>
    </div>
  );
};

export default MemberManager;
