import React, { useState, useMemo } from 'react';
import { Member, Subscription, Expense } from '../types';
import { Wallet, TrendingUp, TrendingDown, Calendar, ChevronDown, ListChecks, ShoppingBag, ShieldCheck, Printer, CheckCircle2, AlertCircle, Home, Users, Award, LayoutDashboard } from 'lucide-react';

interface ReportsProps {
  members: Member[];
  subscriptions: Subscription[];
  expenses: Expense[];
}

const MIN_MONTH = "2024-01";
const FIXED_ADDRESS = "কালিপুর, হোমনা, কুমিল্লা";

type PrintMode = 'collections' | 'expenses' | 'memberSummary' | 'members' | 'full' | 'none';

const Reports: React.FC<ReportsProps> = ({ members, subscriptions, expenses }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date().toISOString().slice(0, 7);
    return now < MIN_MONTH ? MIN_MONTH : now;
  });
  
  const [printMode, setPrintMode] = useState<PrintMode>('none');

  const availableMonths = useMemo(() => {
    const months = new Set([
      ...subscriptions.map(s => s.month),
      ...expenses.map(e => e.date.slice(0, 7))
    ]);
    if (months.size === 0) months.add(MIN_MONTH);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [subscriptions, expenses]);

  const getBengaliMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
      '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
      '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    return `${months[month]} ${year}`;
  };

  // Month Specific Data
  const filteredSubs = useMemo(() => subscriptions.filter(s => s.memberId && s.month === selectedMonth), [subscriptions, selectedMonth]);
  const filteredExps = useMemo(() => expenses.filter(e => e.date.startsWith(selectedMonth)), [expenses, selectedMonth]);
  
  // General Data
  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);
  
  // Month Totals
  const monthTotalIn = filteredSubs.reduce((sum, s) => sum + s.amount, 0);
  const monthTotalOut = filteredExps.reduce((sum, e) => sum + e.amount, 0);
  const monthBalance = monthTotalIn - monthTotalOut;

  const paidMembersCount = useMemo(() => {
    const paidIds = new Set(filteredSubs.map(s => s.memberId));
    return activeMembers.filter(m => paidIds.has(m.id)).length;
  }, [activeMembers, filteredSubs]);

  // Contribution Summary
  const memberSummary = useMemo(() => {
    return activeMembers.map(member => {
      const total = subscriptions
        .filter(s => s.memberId === member.id)
        .reduce((sum, s) => sum + s.amount, 0);
      return { ...member, totalContribution: total };
    }).sort((a, b) => b.totalContribution - a.totalContribution); 
  }, [activeMembers, subscriptions]);

  const handlePrint = (mode: PrintMode) => {
    setPrintMode(mode);
    // Increased timeout slightly to ensure React renders the print view fully
    setTimeout(() => {
      window.print();
      // Keep the mode active for a moment to prevent UI flicker, then reset
      setTimeout(() => setPrintMode('none'), 500);
    }, 100);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'অজানা সদস্য';
  const getMemberHouse = (id: string) => members.find(m => m.id === id)?.houseName || '';

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[2rem] border border-emerald-100 shadow-sm no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="text-emerald-600" size={24} />
          <div className="relative flex-1 md:w-64">
            <select 
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl appearance-none font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{getBengaliMonthName(m)}</option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
        <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">
          রিপোর্ট জেনারেশন সেন্টার
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24} /></div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">মাসের আদায়</p>
            <p className="text-2xl font-black text-emerald-600">৳{monthTotalIn.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingDown size={24} /></div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">মাসের খরচ</p>
            <p className="text-2xl font-black text-rose-600">৳{monthTotalOut.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Wallet size={24} /></div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">মাসের ব্যালেন্স</p>
            <p className="text-2xl font-black text-amber-600">৳{monthBalance.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={24} /></div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-0.5">পরিশোধের হার</p>
            <p className="text-2xl font-black text-blue-600">{paidMembersCount} / {activeMembers.length}</p>
          </div>
        </div>
      </div>

      {/* Report Generation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 no-print">
        {/* Full Report */}
        <button 
          onClick={() => handlePrint('full')}
          className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all flex items-center gap-4 text-left text-white"
        >
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform backdrop-blur-sm">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h4 className="text-lg font-black">মাসিক বিবরণী প্রিন্ট</h4>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">আয় ও ব্যয়ের পূর্ণাঙ্গ তালিকা</p>
          </div>
          <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <Printer size={24} />
          </div>
        </button>

        {/* Member List */}
        <button 
          onClick={() => handlePrint('members')}
          className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
        >
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">সদস্য তালিকা</span>
        </button>

        {/* Collection Report */}
        <button 
          onClick={() => handlePrint('collections')}
          className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Wallet size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">আদায় রিপোর্ট</span>
        </button>

        {/* Expense Report */}
        <button 
          onClick={() => handlePrint('expenses')}
          className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
            <ShoppingBag size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">খরচ রিপোর্ট</span>
        </button>

        {/* Contribution Summary */}
        <button 
          onClick={() => handlePrint('memberSummary')}
          className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-blue-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">মোট অবদান</span>
        </button>
      </div>

      {/* On-Screen Detailed Table (Quick View) - Visible only on screen */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 no-print overflow-hidden shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-black text-gray-800 flex items-center gap-3">
            <ListChecks className="text-emerald-500" size={24} />
            চাঁদা আদায়ের পূর্ণাঙ্গ স্ট্যাটাস ({getBengaliMonthName(selectedMonth)})
          </h4>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-xs font-black text-gray-600 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">সদস্য ও ঠিকানা</th>
                <th className="px-6 py-4 text-left">অবস্থান</th>
                <th className="px-6 py-4 text-center">অবস্থা</th>
                <th className="px-6 py-4 text-right">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.map(member => {
                const subscription = filteredSubs.find(s => s.memberId === member.id);
                const isPaid = !!subscription;
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-800">{member.name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase mt-1">
                        <Home size={10} /> {member.houseName}, {FIXED_ADDRESS}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {member.country}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {isPaid ? <><CheckCircle2 size={12} /> পরিশোধিত</> : <><AlertCircle size={12} /> বকেয়া</>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-base font-black ${isPaid ? 'text-emerald-600' : 'text-gray-400 italic'}`}>
                        {isPaid ? `৳ ${subscription.amount.toLocaleString()}` : '৳ ০'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeMembers.length === 0 && (
            <div className="py-20 text-center text-gray-400 text-sm font-medium italic bg-gray-50/30">
              কোনো সক্রিয় সদস্য পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>

      {/* --- PRINTABLE SECTION (Common for all modes) --- */}
      <div className={`hidden print:block space-y-4 bg-white`}>
        {/* Print Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
           <div className="flex items-center justify-center gap-3 mb-1">
             <ShieldCheck size={32} className="text-black" />
             <h2 className="text-3xl font-black text-black uppercase tracking-tighter">কালিপুর পাহারাদার কল্যাণ তহবিল</h2>
           </div>
           <p className="text-sm font-bold text-black uppercase tracking-[0.3em]">{FIXED_ADDRESS}</p>
           
           <div className="inline-block px-8 py-2 rounded-full font-black text-lg mt-3 border-2 border-black bg-gray-50 text-black">
             {printMode === 'expenses' ? 'মাসিক বাজার ও খরচ রিপোর্ট' : 
              printMode === 'memberSummary' ? 'সদস্যদের আজীবন অবদানের সারসংক্ষেপ' :
              printMode === 'members' ? 'সক্রিয় সদস্য তালিকা' :
              printMode === 'full' ? 'মাসিক আয় ও ব্যয় বিবরণী' :
              'মাসিক চাঁদা আদায় রিপোর্ট'}
           </div>
           
           {printMode !== 'memberSummary' && printMode !== 'members' && (
             <p className="text-base font-black text-black mt-2">মাস: {getBengaliMonthName(selectedMonth)}</p>
           )}
           <p className="text-[10px] font-bold text-gray-600 mt-1">রিপোর্ট প্রকাশের তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>

        {/* --- FULL REPORT (Income & Expense Side by Side or Stacked) --- */}
        {printMode === 'full' && (
          <div className="space-y-6">
            
            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 break-inside-avoid">
              <div className="border border-black p-2 text-center">
                 <p className="text-xs font-bold text-black uppercase">মোট আদায়</p>
                 <p className="text-lg font-black text-black">৳{monthTotalIn.toLocaleString()}</p>
              </div>
              <div className="border border-black p-2 text-center">
                 <p className="text-xs font-bold text-black uppercase">মোট ব্যয়</p>
                 <p className="text-lg font-black text-black">৳{monthTotalOut.toLocaleString()}</p>
              </div>
              <div className="border border-black p-2 text-center bg-gray-100">
                 <p className="text-xs font-bold text-black uppercase">বর্তমান স্থিতি</p>
                 <p className="text-lg font-black text-black">৳{monthBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Income Section */}
            <div className="mb-8">
               <h3 className="text-base font-black text-black border-b border-black mb-2 pb-1">আয় সমূহ (চাঁদা আদায়)</h3>
               <table className="w-full text-sm border-collapse border border-black">
                  <thead className="bg-gray-200 text-xs font-black text-black uppercase">
                    <tr>
                      <th className="px-2 py-1 border border-black text-center w-12">ক্র.</th>
                      <th className="px-2 py-1 border border-black text-left">সদস্যের নাম</th>
                      <th className="px-2 py-1 border border-black text-left">বাড়ির নাম</th>
                      <th className="px-2 py-1 border border-black text-right">টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((sub, idx) => (
                      <tr key={sub.id}>
                        <td className="px-2 py-1 border border-black text-center font-bold">{idx + 1}</td>
                        <td className="px-2 py-1 border border-black font-bold">{getMemberName(sub.memberId)}</td>
                        <td className="px-2 py-1 border border-black text-xs">{getMemberHouse(sub.memberId)}</td>
                        <td className="px-2 py-1 border border-black text-right font-bold">৳{sub.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredSubs.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center italic text-gray-500">এই মাসে কোনো চাঁদা আদায় হয়নি</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 font-black">
                     <tr>
                       <td colSpan={3} className="px-2 py-1 text-right border border-black uppercase text-xs">মোট আয়:</td>
                       <td className="px-2 py-1 text-right border border-black">৳{monthTotalIn.toLocaleString()}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>

            {/* Expense Section */}
            <div>
               <h3 className="text-base font-black text-black border-b border-black mb-2 pb-1">ব্যয় সমূহ (বাজার ও অন্যান্য)</h3>
               <table className="w-full text-sm border-collapse border border-black">
                  <thead className="bg-gray-200 text-xs font-black text-black uppercase">
                    <tr>
                      <th className="px-2 py-1 border border-black text-center w-12">ক্র.</th>
                      <th className="px-2 py-1 border border-black text-left">তারিখ</th>
                      <th className="px-2 py-1 border border-black text-left">বিবরণ</th>
                      <th className="px-2 py-1 border border-black text-right">টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExps.map((exp, idx) => (
                      <tr key={exp.id}>
                        <td className="px-2 py-1 border border-black text-center font-bold">{idx + 1}</td>
                        <td className="px-2 py-1 border border-black text-xs font-bold">{exp.date}</td>
                        <td className="px-2 py-1 border border-black">
                          <span className="font-bold block">{exp.description}</span>
                          {exp.items && exp.items.length > 0 && (
                             <span className="text-[10px] block">
                               {exp.items.map(i => `${i.name} (${i.amount})`).join(', ')}
                             </span>
                          )}
                        </td>
                        <td className="px-2 py-1 border border-black text-right font-bold">৳{exp.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredExps.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center italic text-gray-500">এই মাসে কোনো খরচ নেই</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 font-black">
                     <tr>
                       <td colSpan={3} className="px-2 py-1 text-right border border-black uppercase text-xs">মোট ব্যয়:</td>
                       <td className="px-2 py-1 text-right border border-black">৳{monthTotalOut.toLocaleString()}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
          </div>
        )}

        {/* --- MEMBER LIST --- */}
        {printMode === 'members' && (
          <div className="border border-black">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-200 text-xs font-black text-black uppercase border-b border-black">
                <tr>
                  <th className="px-2 py-2 border-r border-black w-10 text-center">নং</th>
                  <th className="px-2 py-2 border-r border-black">নাম</th>
                  <th className="px-2 py-2 border-r border-black">বাড়ির নাম</th>
                  <th className="px-2 py-2 border-r border-black">মোবাইল</th>
                  <th className="px-2 py-2 text-center">দেশ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {activeMembers.map((member, idx) => (
                  <tr key={member.id} className="border-b border-black">
                    <td className="px-2 py-1 text-center border-r border-black font-bold">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-black font-black">{member.name}</td>
                    <td className="px-2 py-1 border-r border-black text-xs">{member.houseName}</td>
                    <td className="px-2 py-1 border-r border-black text-xs">{member.mobile || '-'}</td>
                    <td className="px-2 py-1 text-center text-xs font-bold">{member.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- COLLECTIONS ONLY --- */}
        {printMode === 'collections' && (
          <div className="border border-black">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-200 text-xs font-black text-black uppercase border-b border-black">
                <tr>
                  <th className="px-2 py-2 border-r border-black w-10 text-center">নং</th>
                  <th className="px-2 py-2 border-r border-black">সদস্যের নাম</th>
                  <th className="px-2 py-2 border-r border-black">বাড়ির নাম</th>
                  <th className="px-2 py-2 text-right">টাকার পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub, idx) => (
                  <tr key={sub.id} className="border-b border-black">
                    <td className="px-2 py-1 text-center border-r border-black font-bold">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-black font-black">{getMemberName(sub.memberId)}</td>
                    <td className="px-2 py-1 border-r border-black text-xs">{getMemberHouse(sub.memberId)}</td>
                    <td className="px-2 py-1 text-right font-bold">৳{sub.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-200 font-black">
                <tr>
                  <td colSpan={3} className="px-2 py-1 text-right border-t border-black">মোট:</td>
                  <td className="px-2 py-1 text-right border-t border-black">৳{monthTotalIn.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* --- EXPENSES ONLY --- */}
        {printMode === 'expenses' && (
           <div className="border border-black">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-200 text-xs font-black text-black uppercase border-b border-black">
                <tr>
                  <th className="px-2 py-2 border-r border-black w-10 text-center">নং</th>
                  <th className="px-2 py-2 border-r border-black">তারিখ</th>
                  <th className="px-2 py-2 border-r border-black">বিবরণ</th>
                  <th className="px-2 py-2 text-right">টাকার পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {filteredExps.map((exp, idx) => (
                  <tr key={exp.id} className="border-b border-black">
                    <td className="px-2 py-1 text-center border-r border-black font-bold">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-black text-xs font-bold">{exp.date}</td>
                    <td className="px-2 py-1 border-r border-black">
                       <span className="font-bold">{exp.description}</span>
                       {exp.items && exp.items.length > 0 && <span className="text-[10px] block">({exp.items.map(i => i.name).join(', ')})</span>}
                    </td>
                    <td className="px-2 py-1 text-right font-bold">৳{exp.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-200 font-black">
                <tr>
                  <td colSpan={3} className="px-2 py-1 text-right border-t border-black">মোট:</td>
                  <td className="px-2 py-1 text-right border-t border-black">৳{monthTotalOut.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* --- SUMMARY ONLY --- */}
        {printMode === 'memberSummary' && (
           <div className="border border-black">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-200 text-xs font-black text-black uppercase border-b border-black">
                <tr>
                  <th className="px-2 py-2 border-r border-black w-10 text-center">নং</th>
                  <th className="px-2 py-2 border-r border-black">সদস্যের নাম</th>
                  <th className="px-2 py-2 border-r border-black">বাড়ির নাম</th>
                  <th className="px-2 py-2 text-right">মোট অবদান</th>
                </tr>
              </thead>
              <tbody>
                {memberSummary.map((mem, idx) => (
                  <tr key={mem.id} className="border-b border-black">
                    <td className="px-2 py-1 text-center border-r border-black font-bold">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-black font-black">{mem.name}</td>
                    <td className="px-2 py-1 border-r border-black text-xs">{mem.houseName}</td>
                    <td className="px-2 py-1 text-right font-bold">৳{mem.totalContribution.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Signatures - Positioned at bottom */}
        <div className="mt-16 flex justify-between px-8 break-inside-avoid">
            <div className="text-center w-36 border-t-2 border-black pt-2">
                <p className="font-bold text-black text-sm">হিসাব রক্ষক</p>
            </div>
            <div className="text-center w-36 border-t-2 border-black pt-2">
                <p className="font-bold text-black text-sm">সভাপতি / সেক্রেটারি</p>
            </div>
        </div>

        <div className="text-center mt-8 pt-4 border-t border-black">
            <p className="text-[10px] text-black font-bold uppercase tracking-[0.2em]">রিপোর্ট জেনারেটেড বাই: কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;