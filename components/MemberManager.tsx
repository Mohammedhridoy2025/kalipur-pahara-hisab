import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Member, Subscription } from '../types';
import { Plus, Search, Edit2, ChevronDown, ChevronUp, Wallet, Filter, UserCheck, UserMinus, Printer, ShieldCheck, Home, AlertCircle, XCircle, CheckCircle2, RefreshCw, Trash2, Loader2, Camera, Phone, Globe, Lock, User, ArrowDownUp, MoreVertical, MapPin, Award } from 'lucide-react';
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

// List of Countries
const COUNTRY_OPTIONS = [
  "সৌদি আরব", "সংযুক্ত আরব আমিরাত", "ওমান", "মালয়েশিয়া", "কাতার", "কুয়েত", "সিঙ্গাপুর",
  "যুক্তরাজ্য (ব্রিটেন)", "ইতালি", "পর্তুগাল", "গ্রিস", "ফ্রান্স", "স্পেন", "জার্মানি", "রোমানিয়া",
  "যুক্তরাষ্ট্র (আমেরিকা)", "কানাডা", "অস্ট্রেলিয়া", "দক্ষিণ কোরিয়া", "বাহরাইন", "জর্ডান", "মালদ্বীপ", "লেবানন", "ব্রুনাই", "জাপান", "দক্ষিণ আফ্রিকা"
];

type SortKey = 'name' | 'houseName' | 'country' | 'totalContribution' | 'status';

const MemberManager: React.FC<MemberManagerProps> = ({ members, subscriptions, initialOpen, onCloseModal, onAddSubscription, isAdmin }) => {
  const [isModalOpen, setIsModalOpen] = useState(initialOpen || false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortConfig, setSortConfig] = useState<{key: SortKey, direction: 'asc' | 'desc'}>({ key: 'name', direction: 'asc' });
  
  // Country Dropdown State
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom Confirmation States
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Member>>({
    name: '', houseName: '', mobile: '', country: '', status: 'active', photoUrl: ''
  });

  // Handle click outside for country dropdown
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
      return matchesSearch && matchesStatus;
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
  }, [members, searchTerm, statusFilter, sortConfig, subscriptions]);

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

      const dataSize = new Blob([JSON.stringify(finalData)]).size;
      if (dataSize > 1000000) { 
          alert("ডাটা অনেক বড় হয়ে গেছে (সম্ভবত ছবির কারণে)। দয়া করে ছোট ছবি ব্যবহার করুন।");
          setIsSaving(false);
          return;
      }

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
      console.error("Save Error:", err);
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
        const data = docSnap.data();
        await trashCol.add({
          originalId: memberId,
          type: 'member',
          data: { ...data, id: memberId }, 
          deletedAt: new Date().toISOString()
        });
        await docRef.delete();
        alert("সদস্যকে সফলভাবে রিসাইকেল বিনে পাঠানো হয়েছে।");
      }
      setConfirmDeleteId(null);
    } catch (error: any) {
      alert(`ডিলিট করা যায়নি। এরর: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePrintMemberList = () => {
    // Triggers standard browser print. 
    // CSS in index.html with .print-only class handles the layout.
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Search and Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 no-print">
        <div className="relative flex-1 w-full shadow-sm rounded-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="সদস্য বা বাড়ি দিয়ে খুঁজুন..." 
            className="w-full pl-14 pr-6 py-5 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-gray-800 placeholder-gray-400 text-base shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Status Filter */}
          <div className="relative flex-1 min-w-[150px]">
            <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-11 pr-10 py-5 bg-white border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-gray-700 text-sm appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">সব সদস্য</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 min-w-[150px]">
            <ArrowDownUp size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700" />
            <select 
              value={sortConfig.key}
              onChange={handleSortChange}
              className="w-full pl-11 pr-10 py-5 bg-white border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-gray-700 text-sm appearance-none cursor-pointer shadow-sm"
            >
              <option value="name">নাম (A-Z)</option>
              <option value="totalContribution">সর্বোচ্চ অবদান</option>
              <option value="houseName">বাড়ির নাম</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          
          <button 
            onClick={handlePrintMemberList} 
            className="flex items-center gap-3 px-6 py-5 bg-white text-gray-700 rounded-2xl font-black text-sm shadow-sm hover:bg-emerald-50 hover:text-emerald-800 transition-all active:scale-95 border-2 border-gray-100 whitespace-nowrap"
          >
            <Printer size={20} />
          </button>

          {isAdmin && (
            <button 
              onClick={() => { setEditingMember(null); setFormData({ name: '', houseName: '', mobile: '', country: '', status: 'active', photoUrl: '' }); setIsModalOpen(true); }} 
              className="whitespace-nowrap bg-gray-900 text-white px-8 py-5 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-emerald-600 transition-all hover:-translate-y-1 active:translate-y-0 text-sm md:text-base border border-gray-800"
            >
              <Plus size={22} /> <span className="hidden md:inline">নতুন সদস্য</span>
            </button>
          )}
        </div>
      </div>

      {/* Member Grid - Refined ID Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
         {sortedMembers.map(member => {
           const total = getMemberTotalContribution(member.id);
           return (
             <div key={member.id} className="group relative bg-white rounded-[2rem] overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col">
                
                {/* Header Pattern Banner */}
                <div className="h-24 bg-emerald-600 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:10px_10px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-90"></div>
                    
                    {/* Top Actions */}
                    {isAdmin && (
                      <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <button 
                           onClick={() => { setEditingMember(member); setFormData(member); setIsModalOpen(true); }} 
                           className="p-1.5 bg-white/20 text-white hover:bg-white hover:text-emerald-700 rounded-lg backdrop-blur-md transition-all border border-white/30"
                           title="এডিট"
                         >
                           <Edit2 size={14} />
                         </button>
                         <button 
                           onClick={() => setConfirmDeleteId(member.id)} 
                           disabled={isDeleting === member.id} 
                           className="p-1.5 bg-white/20 text-white hover:bg-rose-500 hover:text-white rounded-lg backdrop-blur-md transition-all border border-white/30"
                           title="ডিলিট"
                         >
                           {isDeleting === member.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                         </button>
                      </div>
                    )}
                </div>

                {/* Overlapping Avatar & Status */}
                <div className="relative -mt-12 px-6 flex justify-between items-end">
                    <div className="relative">
                         <div className="w-24 h-24 rounded-2xl border-[5px] border-white shadow-md bg-white overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
                             <img 
                               src={member.photoUrl || DEFAULT_PHOTO} 
                               className="w-full h-full object-cover" 
                               alt={member.name} 
                             />
                         </div>
                         {member.country && (
                             <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-lg shadow-sm border border-gray-100 text-[10px] flex items-center gap-1 font-bold text-gray-600" title={member.country}>
                                <Globe size={12} className="text-blue-500" />
                             </div>
                         )}
                    </div>
                    {/* Status Pill */}
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider mb-2 border ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 pt-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-gray-800 leading-tight mb-1 line-clamp-1" title={member.name}>
                        {member.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-5">
                         <Home size={12} className="text-emerald-500" /> 
                         {member.houseName}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col justify-center">
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5 flex items-center gap-1">
                                <Phone size={10} /> মোবাইল
                             </p>
                             <p className="text-xs font-black text-gray-700 truncate" title={member.mobile}>
                                {member.mobile || 'নেই'}
                             </p>
                         </div>
                         <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                             <p className="text-[10px] text-emerald-600/70 font-bold uppercase mb-0.5 flex items-center gap-1">
                                <Award size={10} /> মোট দান
                             </p>
                             <p className="text-sm font-black text-emerald-700">
                                ৳{total.toLocaleString()}
                             </p>
                         </div>
                    </div>

                    {/* Footer Button */}
                    <div className="mt-auto">
                         {isAdmin ? (
                           <button 
                             onClick={() => onAddSubscription?.(member.id)} 
                             className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg"
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
         
         {/* Empty State */}
         {sortedMembers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                 <User size={32} />
               </div>
               <p className="text-gray-400 font-bold">কোনো সদস্য পাওয়া যায়নি</p>
            </div>
         )}
      </div>

      {/* --- PRINTABLE SECTION FOR MEMBER LIST --- */}
      <div className="print-only bg-white w-full">
        
        {/* Fixed Footer for Every Page */}
        <div className="fixed bottom-0 left-0 w-full text-center bg-white pb-4 pt-2 border-t border-gray-300">
           <div className="flex justify-between px-8 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <span>কালিপুর পাহারাদার কল্যাণ তহবিল</span>
              <span>তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
              <span>পৃষ্ঠা প্রিন্ট</span>
           </div>
        </div>

        {/* Main Table */}
        <table className="w-full text-left border-collapse">
            <thead className="bg-white">
              {/* Report Header (Repeats on every page by virtue of being in thead) */}
              <tr>
                <th colSpan={3} className="pb-6 pt-2 border-b-2 border-black">
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-3 mb-1">
                       <ShieldCheck size={32} className="text-black" />
                       <h1 className="text-3xl font-black text-black uppercase tracking-tight leading-none">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
                     </div>
                     <p className="text-sm font-bold text-gray-600 mt-1 uppercase tracking-[0.3em]">{FIXED_ADDRESS}</p>
                     <p className="text-xs font-bold text-gray-500 mt-2 bg-gray-100 inline-block px-3 py-1 rounded-full">সদস্য তালিকা ও অনুদান স্থিতি - {new Date().toLocaleDateString('bn-BD', {year:'numeric', month:'long'})}</p>
                   </div>
                </th>
              </tr>
              {/* Column Headers */}
              <tr className="bg-gray-100 text-xs font-black text-black uppercase tracking-widest border-b border-black">
                <th className="border border-black px-4 py-3 text-center w-16">নং</th>
                <th className="border border-black px-4 py-3 text-left">সদস্য ও বিস্তারিত তথ্য</th>
                <th className="border border-black px-4 py-3 text-right w-40">মোট অবদান</th>
              </tr>
            </thead>

            <tbody>
              {sortedMembers.map((member, idx) => (
                <tr key={member.id} className="break-inside-avoid border-b border-gray-300">
                  <td className="border-l border-r border-black px-4 py-3 text-center font-black align-top pt-5">{idx + 1}</td>
                  
                  <td className="border-r border-black px-4 py-3 align-top">
                     <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="w-14 h-14 rounded-xl border border-gray-200 overflow-hidden shrink-0 mt-1">
                           <img src={member.photoUrl || DEFAULT_PHOTO} alt="" className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                             <h3 className="font-black text-lg text-black leading-tight">{member.name}</h3>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                             </span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-800 font-bold">
                                 <Home size={12} className="text-gray-500" /> 
                                 {member.houseName}
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                 <Phone size={12} className="text-gray-500" /> 
                                 {member.mobile || 'মোবাইল নেই'}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 col-span-2 text-xs mt-0.5">
                                 <Globe size={12} className="text-gray-400" /> 
                                 বর্তমান অবস্থান: {member.country}
                              </div>
                           </div>
                        </div>
                     </div>
                  </td>
                  
                  <td className="border-r border-black px-4 py-3 text-right align-middle bg-gray-50/30">
                     <span className="font-black text-xl text-black">৳{getMemberTotalContribution(member.id).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            
            {/* Table Footer for Grand Total */}
            <tfoot>
               <tr className="border-t-2 border-black">
                 <td colSpan={2} className="px-4 py-3 text-right font-black text-base uppercase bg-gray-100">সর্বমোট তহবিল সংগ্রহ:</td>
                 <td className="px-4 py-3 text-right font-black text-xl bg-gray-200 text-black border-l border-black border-r border-b">
                   ৳{subscriptions.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                 </td>
               </tr>
               
               {/* Spacer for bottom signatures to ensure they don't get cut off or overlap fixed footer */}
               <tr className="border-none">
                 <td colSpan={3} className="pt-24 pb-8 px-8 border-none">
                    <div className="flex justify-between break-inside-avoid">
                        <div className="text-center">
                            <div className="w-40 border-t-2 border-black mb-2"></div>
                            <p className="text-sm font-black">কোষাধ্যক্ষ</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 border-t-2 border-black mb-2"></div>
                            <p className="text-sm font-black">সভাপতি / সেক্রেটারি</p>
                        </div>
                    </div>
                 </td>
               </tr>
            </tfoot>
        </table>
        
        {/* Invisible spacer at bottom to prevent content hiding behind fixed footer */}
        <div className="h-10"></div>
      </div>

      {/* Add/Edit Modal and other Modals retained below */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[150] no-print transition-all duration-300">
           <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-300 border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                  {editingMember ? 'সদস্য তথ্য হালনাগাদ' : 'নতুন সদস্য নিবন্ধন'}
                </h3>
                <p className="text-gray-500 font-bold text-sm mt-1">
                  {editingMember ? 'সদস্যের বর্তমান তথ্য পরিবর্তন করুন' : 'তহবিলের জন্য নতুন সদস্য যুক্ত করুন'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-2xl transition-all"
              >
                <XCircle size={28} />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="flex flex-col items-center">
                  <div className="relative group">
                     <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-xl">
                       <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden relative">
                         <img 
                           src={formData.photoUrl || (editingMember?.photoUrl || DEFAULT_PHOTO)} 
                           className="w-full h-full rounded-full object-cover"
                           alt="Profile"
                         />
                         <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                            <Camera size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Upload</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                         </label>
                       </div>
                     </div>
                     <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-lg border border-gray-100 text-emerald-600 group-hover:scale-0 transition-transform">
                       <Edit2 size={16} />
                     </div>
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-widest">প্রোফাইল ছবি</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">সদস্যের নাম</label>
                     <div className="relative">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input 
                         type="text" 
                         placeholder="সদস্যের পূর্ণ নাম..." 
                         className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         required
                       />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">বাড়ির নাম</label>
                     <div className="relative">
                       <Home className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input 
                         type="text" 
                         placeholder="বাড়ির নাম..." 
                         className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                         value={formData.houseName}
                         onChange={e => setFormData({...formData, houseName: e.target.value})}
                         required
                       />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">মোবাইল</label>
                     <div className="relative">
                       <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input 
                         type="tel" 
                         placeholder="017..." 
                         className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                         value={formData.mobile}
                         onChange={e => setFormData({...formData, mobile: e.target.value})}
                       />
                     </div>
                  </div>

                  <div className="space-y-2 relative" ref={countryDropdownRef}>
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">বর্তমান দেশ</label>
                     <div className="relative">
                       <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input 
                         type="text"
                         placeholder="দেশ নির্বাচন করুন..."
                         className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                         value={formData.country}
                         onChange={e => {
                           setFormData({...formData, country: e.target.value});
                           setIsCountryDropdownOpen(true);
                         }}
                         onFocus={() => setIsCountryDropdownOpen(true)}
                       />
                       <ChevronDown size={20} className={`absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                       
                       {isCountryDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {COUNTRY_OPTIONS.filter(c => c.toLowerCase().includes(formData.country?.toLowerCase() || '')).map((c, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left px-5 py-3 hover:bg-emerald-50 font-bold text-gray-700 hover:text-emerald-700 transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => {
                                  setFormData({...formData, country: c});
                                  setIsCountryDropdownOpen(false);
                                }}
                              >
                                {c}
                              </button>
                            ))}
                            {COUNTRY_OPTIONS.filter(c => c.toLowerCase().includes(formData.country?.toLowerCase() || '')).length === 0 && (
                               <div className="px-5 py-3 text-gray-400 text-sm font-bold">কোনো দেশ পাওয়া যায়নি</div>
                            )}
                          </div>
                       )}
                     </div>
                  </div>

                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">অ্যাকাউন্ট স্ট্যাটাস</label>
                     <div className="relative">
                       <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          {formData.status === 'active' ? <UserCheck size={20} className="text-emerald-500" /> : <UserMinus size={20} className="text-gray-400" />}
                       </div>
                       <select 
                         className="w-full pl-14 pr-10 py-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                         value={formData.status}
                         onChange={e => setFormData({...formData, status: e.target.value as any})}
                       >
                         <option value="active">সক্রিয় (Active)</option>
                         <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                       </select>
                       <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                     </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : (editingMember ? <CheckCircle2 size={24} /> : <Plus size={24} />)}
                  {isSaving ? 'প্রসেসিং হচ্ছে...' : (editingMember ? 'তথ্য আপডেট করুন' : 'সদস্য যোগ করুন')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {isUpdateConfirmOpen && isAdmin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">তথ্য আপডেট নিশ্চিত করুন</h3>
              <p className="text-gray-600 font-medium text-base mb-8 leading-relaxed">আপনি কি নিশ্চিত যে এই সদস্যের তথ্যগুলো পরিবর্তন করতে চান? এটি বিদ্যমান রেকর্ডকে আপডেট করবে।</p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setIsUpdateConfirmOpen(false)} 
                  disabled={isSaving}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 border-2 border-transparent hover:border-gray-300"
                >
                  <XCircle size={20} /> ফিরে যান
                </button>
                <button 
                  onClick={performSave}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  {isSaving ? 'সেভ হচ্ছে...' : 'হ্যাঁ, আপডেট করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && isAdmin && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">সদস্য মুছে ফেলতে চান?</h3>
              <p className="text-gray-600 font-medium text-base mb-8 leading-relaxed">
                আপনি কি নিশ্চিত যে আপনি এই সদস্যকে মুছে ফেলতে চান? এটি চিরতরে মুছে যাবে না, বরং <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">রিসাইকেল বিনে</span> জমা হবে।
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setConfirmDeleteId(null)} 
                  disabled={!!isDeleting}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 border-2 border-transparent hover:border-gray-300"
                >
                  <XCircle size={20} /> বাতিল
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={!!isDeleting}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManager;