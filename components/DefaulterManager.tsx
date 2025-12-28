
import React, { useState, useMemo } from 'react';
import { Member, Subscription } from '../types';
import { AlertCircle, Calendar, Search, MapPin, Wallet, History, Home, ArrowRight, CheckCircle2, Info, Printer, ShieldCheck, Filter } from 'lucide-react';

interface DefaulterManagerProps {
  members: Member[];
  subscriptions: Subscription[];
  onAddSubscription: (memberId: string) => void;
}

const MIN_MONTH = "2025-12";
const FIXED_ADDRESS = "কালিপুর, হোমনা, কুমিল্লা";

const DefaulterManager: React.FC<DefaulterManagerProps> = ({ members, subscriptions, onAddSubscription }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const current = new Date().toISOString().slice(0, 7);
    return current < MIN_MONTH ? MIN_MONTH : current;
  });
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique house names from active members
  const availableHouses = useMemo(() => {
    const houses = new Set(members.filter(m => m.status === 'active').map(m => m.houseName));
    return Array.from(houses).sort();
  }, [members]);

  const allMonths = useMemo(() => {
    const months = [];
    const start = new Date(MIN_MONTH + "-01");
    const end = new Date();
    
    let current = new Date(start);
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    return months.reverse(); 
  }, []);

  const getBengaliMonthName = (monthStr: string) => {
    const [year, monthPart] = monthStr.split('-');
    const months: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
      '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
      '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    return months[monthPart] ? `${months[monthPart]} ${year}` : monthStr;
  };

  const monthlyDefaulters = useMemo(() => {
    const paidMemberIds = new Set(
      subscriptions.filter(s => s.month === selectedMonth).map(s => s.memberId)
    );
    
    return members.filter(m => {
      const isActive = m.status === 'active';
      const isDefaulter = !paidMemberIds.has(m.id);
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.houseName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHouse = selectedHouse === 'all' || m.houseName === selectedHouse;

      return isActive && isDefaulter && matchesSearch && matchesHouse;
    });
  }, [members, subscriptions, selectedMonth, searchTerm, selectedHouse]);

  const memberHistory = useMemo(() => {
    const historyMap: Record<string, string[]> = {};
    members.forEach(m => {
      if (m.status !== 'active') return;
      const paidMonths = new Set(
        subscriptions.filter(s => s.memberId === m.id).map(s => s.month)
      );
      const missing = allMonths.filter(month => !paidMonths.has(month));
      historyMap[m.id] = missing;
    });
    return historyMap;
  }, [members, subscriptions, allMonths]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* --- UI ONLY SECTION --- */}
      <div className="no-print space-y-8">
        {/* Header Info */}
        <div className="bg-gradient-to-br from-rose-600 to-rose-800 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-rose-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <AlertCircle size={180} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20">
                 <span className="w-2 h-2 bg-rose-300 rounded-full animate-pulse"></span>
                 <span className="text-[10px] font-black uppercase tracking-widest">শুরু: ১১ ডিসেম্বর ২০২৫</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-none">বকেয়া চাঁদার রিপোর্ট</h2>
              <p className="text-rose-100 font-bold max-w-md leading-relaxed">ডিসেম্বর ২০২৫ থেকে বর্তমান সময় পর্যন্ত অনাদায়ী সদস্যদের তালিকা।</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl px-10 py-6 rounded-[2rem] border border-white/20 text-center shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">ফিল্টার অনুযায়ী বকেয়া</p>
              <p className="text-5xl font-black">{monthlyDefaulters.length}<span className="text-xl font-bold opacity-50 ml-2">জন</span></p>
            </div>
          </div>
        </div>

        {/* Filter Options */}
        <div className="flex flex-col xl:flex-row gap-4 sticky top-4 z-40">
          {/* Search Box */}
          <div className="relative flex-1 group shadow-sm rounded-[1.5rem]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="সদস্যের নাম দিয়ে সার্চ করুন..." 
              className="w-full pl-14 pr-6 py-5 bg-white border-2 border-gray-100 rounded-[1.5rem] font-bold text-gray-800 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-4">
            {/* House Filter */}
            <div className="relative w-full md:w-64">
              <Home className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-600" size={20} />
              <select 
                className="w-full pl-14 pr-12 py-5 bg-white border-2 border-gray-100 rounded-[1.5rem] font-black text-gray-800 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 shadow-sm appearance-none cursor-pointer transition-all"
                value={selectedHouse}
                onChange={(e) => setSelectedHouse(e.target.value)}
              >
                <option value="all">সব বাড়ি</option>
                {availableHouses.map(house => (
                  <option key={house} value={house}>{house}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <Filter size={16} />
              </div>
            </div>

            {/* Month Filter */}
            <div className="relative w-full md:w-64">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-600" size={20} />
              <select 
                className="w-full pl-14 pr-12 py-5 bg-white border-2 border-gray-100 rounded-[1.5rem] font-black text-gray-800 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 shadow-sm appearance-none cursor-pointer transition-all"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {allMonths.map(m => (
                  <option key={m} value={m}>{getBengaliMonthName(m)}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <ArrowRight className="rotate-90" size={16} />
              </div>
            </div>

            {/* Print Button */}
            <button 
              onClick={handlePrint}
              className="px-8 py-5 bg-gray-900 text-white rounded-[1.5rem] font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Printer size={20} /> প্রিন্ট
            </button>
          </div>
        </div>

        {/* Defaulter Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {monthlyDefaulters.length > 0 ? (
            monthlyDefaulters.map(member => (
              <div key={member.id} className="bg-white rounded-[2.5rem] p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all group relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                  {/* Profile Section */}
                  <div className="flex gap-5 flex-1">
                    <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-lg border-4 border-white shrink-0 group-hover:scale-105 transition-transform duration-500">
                      <img src={member.photoUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={member.name} />
                    </div>
                    <div className="space-y-1.5 py-1">
                      <h4 className="text-xl font-black text-gray-900 leading-tight">{member.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md"><Home size={12} /></div>
                        {member.houseName}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <div className="p-1 bg-rose-50 text-rose-400 rounded-md"><MapPin size={12} /></div>
                        {member.country}
                      </div>
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="flex flex-col md:items-end justify-between gap-4">
                    <div className="px-5 py-2 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-2 self-start md:self-auto shadow-sm">
                      <AlertCircle size={14} /> বকেয়া আছে
                    </div>
                    <button 
                      onClick={() => onAddSubscription(member.id)}
                      className="flex items-center gap-3 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-xl hover:shadow-emerald-200 group-hover:-translate-y-1"
                    >
                      <Wallet size={18} /> চাঁদা জমা নিন
                    </button>
                  </div>
                </div>

                {/* Missing Timeline */}
                <div className="mt-8 pt-7 border-t border-gray-100 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-rose-500" />
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">বকেয়া মাসসমূহের তালিকা</span>
                    </div>
                    <span className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black shadow-md shadow-rose-100">
                      মোট {memberHistory[member.id]?.length || 0} মাস বাকি
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {memberHistory[member.id]?.slice(0, 10).map(month => (
                      <div key={month} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all duration-300 flex items-center gap-1.5 ${month === selectedMonth ? 'bg-rose-600 text-white border-rose-600 shadow-lg scale-110 z-10' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-rose-300 hover:text-rose-600'}`}>
                        {month === selectedMonth && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
                        {getBengaliMonthName(month)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-40 bg-white rounded-[4rem] border-4 border-dashed border-gray-50 text-center flex flex-col items-center justify-center space-y-6">
               <div className="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center animate-bounce shadow-2xl shadow-emerald-100">
                  <CheckCircle2 size={56} strokeWidth={3} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-3xl font-black text-gray-800">কোনো বকেয়া পাওয়া যায়নি</h3>
                  <p className="text-gray-400 font-bold text-lg max-w-sm mx-auto">ফিল্টার অনুযায়ী সকল সদস্য তাদের চাঁদা সঠিকভাবে পরিশোধ করেছেন।</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* --- PRINT ONLY SECTION --- */}
      <div className="print-only bg-white w-full">
        <div className="text-center border-b-2 border-black pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-1">
            <ShieldCheck size={40} className="text-black" />
            <h1 className="text-3xl font-black text-black uppercase tracking-tighter">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
          </div>
          <p className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em]">{FIXED_ADDRESS}</p>
          <div className="inline-block mt-4 px-8 py-2 border-2 border-black bg-gray-50 rounded-full font-black text-lg">
            বকেয়া চাঁদার রিপোর্ট - {getBengaliMonthName(selectedMonth)}
          </div>
          <div className="mt-2 font-black text-sm uppercase tracking-widest text-gray-700">
             বাড়ির নাম: {selectedHouse === 'all' ? 'সকল বাড়ি' : selectedHouse}
          </div>
          <p className="text-xs font-bold text-gray-500 mt-2">প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>

        <table className="w-full text-left border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 text-xs font-black uppercase border-b border-black">
              <th className="border border-black px-4 py-3 text-center w-12">নং</th>
              <th className="border border-black px-4 py-3">সদস্যের নাম</th>
              <th className="border border-black px-4 py-3">বাড়ির নাম</th>
              <th className="border border-black px-4 py-3">অবস্থান</th>
              <th className="border border-black px-4 py-3 text-center">বকেয়া মাস</th>
            </tr>
          </thead>
          <tbody>
            {monthlyDefaulters.map((member, idx) => (
              <tr key={member.id} className="border-b border-black text-sm">
                <td className="border-r border-black px-4 py-3 text-center font-bold">{idx + 1}</td>
                <td className="border-r border-black px-4 py-3 font-black">{member.name}</td>
                <td className="border-r border-black px-4 py-3 font-bold">{member.houseName}</td>
                <td className="border-r border-black px-4 py-3 text-xs">{member.country}</td>
                <td className="px-4 py-3 text-center">
                   <span className="font-black text-rose-600">মোট {memberHistory[member.id]?.length || 0} মাস</span>
                </td>
              </tr>
            ))}
            {monthlyDefaulters.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center font-bold text-gray-500 italic">এই ক্যাটাগরিতে কোনো বকেয়া নেই।</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-20 flex justify-between px-10 break-inside-avoid">
          <div className="text-center">
            <div className="w-40 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black text-black uppercase">কোষাধ্যক্ষ</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black text-black uppercase">সভাপতি / সেক্রেটারি</p>
          </div>
        </div>

        <div className="fixed bottom-4 left-0 right-0 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-2">
          রিপোর্ট জেনারেটেড বাই: কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম
        </div>
      </div>
    </div>
  );
};

export default DefaulterManager;
