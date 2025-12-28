
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
    return months[month] ? `${months[month]} ${year}` : monthStr;
  };

  const filteredSubs = useMemo(() => subscriptions.filter(s => s.memberId && s.month === selectedMonth), [subscriptions, selectedMonth]);
  const filteredExps = useMemo(() => expenses.filter(e => e.date.startsWith(selectedMonth)), [expenses, selectedMonth]);
  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);
  
  const monthTotalIn = filteredSubs.reduce((sum, s) => sum + s.amount, 0);
  const monthTotalOut = filteredExps.reduce((sum, e) => sum + e.amount, 0);
  const monthBalance = monthTotalIn - monthTotalOut;

  const paidMembersCount = useMemo(() => {
    const paidIds = new Set(filteredSubs.map(s => s.memberId));
    return activeMembers.filter(m => paidIds.has(m.id)).length;
  }, [activeMembers, filteredSubs]);

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
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode('none'), 1000);
    }, 200);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'অজানা সদস্য';
  const getMemberHouse = (id: string) => members.find(m => m.id === id)?.houseName || '';

  return (
    <div className="space-y-6">
      {/* UI Controls Section */}
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

      {/* Analytics Cards */}
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

      {/* Print Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 no-print">
        <button onClick={() => handlePrint('full')} className="lg:col-span-2 group relative overflow-hidden bg-gray-900 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all flex items-center gap-4 text-left text-white">
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><LayoutDashboard size={28} /></div>
          <div>
            <h4 className="text-lg font-black">মাসিক পূর্ণাঙ্গ রিপোর্ট</h4>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">আয় ও ব্যয়ের পূর্ণাঙ্গ তালিকা</p>
          </div>
          <Printer className="absolute right-6 opacity-20" size={40} />
        </button>

        <button onClick={() => handlePrint('members')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
          <span className="font-bold text-gray-700 text-sm">সদস্য তালিকা</span>
        </button>

        <button onClick={() => handlePrint('collections')} className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><Wallet size={24} /></div>
          <span className="font-bold text-gray-700 text-sm">আদায় রিপোর্ট</span>
        </button>

        <button onClick={() => handlePrint('expenses')} className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform"><ShoppingBag size={24} /></div>
          <span className="font-bold text-gray-700 text-sm">খরচ রিপোর্ট</span>
        </button>
      </div>

      {/* Screen Only Table */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 no-print overflow-hidden shadow-sm">
        <h4 className="text-lg font-black text-gray-800 flex items-center gap-3 mb-6">
          <ListChecks className="text-emerald-500" size={24} />
          চাঁদা আদায়ের স্ট্যাটাস ({getBengaliMonthName(selectedMonth)})
        </h4>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
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
                      <div className="text-xs font-bold text-gray-500 uppercase mt-1">{member.houseName}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">{member.country}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPaid ? 'পরিশোধিত' : 'বকেয়া'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black">৳ {isPaid ? subscription.amount.toLocaleString() : '০'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PRINTABLE ENGINE --- */}
      <div className="print-only">
        <div className="text-center border-b-4 border-black pb-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ShieldCheck size={48} className="text-black" />
            <h1 className="text-4xl font-black text-black tracking-tighter uppercase">কালিপুর পাহারাদার কল্যাণ তহবিল</h1>
          </div>
          <p className="text-lg font-bold text-black uppercase tracking-[0.2em]">{FIXED_ADDRESS}</p>
          <div className="inline-block mt-4 px-10 py-2 border-2 border-black bg-gray-50 rounded-full font-black text-xl">
             {printMode === 'expenses' ? 'মাসিক বাজার ও খরচ রিপোর্ট' : 
              printMode === 'members' ? 'সক্রিয় সদস্য তালিকা' :
              printMode === 'full' ? 'মাসিক পূর্ণাঙ্গ আয়-ব্যয় রিপোর্ট' :
              'মাসিক চাঁদা আদায় রিপোর্ট'}
          </div>
          <p className="text-lg font-bold text-black mt-4">মাস: {getBengaliMonthName(selectedMonth)}</p>
        </div>

        {printMode === 'full' && (
          <div className="space-y-10">
            <div className="grid grid-cols-3 gap-0 border-2 border-black">
              <div className="border-r-2 border-black p-4 text-center">
                <p className="text-[10pt] font-bold uppercase mb-1">মোট আদায়</p>
                <p className="text-2xl font-black">৳{monthTotalIn.toLocaleString()}</p>
              </div>
              <div className="border-r-2 border-black p-4 text-center">
                <p className="text-[10pt] font-bold uppercase mb-1">মোট ব্যয়</p>
                <p className="text-2xl font-black">৳{monthTotalOut.toLocaleString()}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10pt] font-bold uppercase mb-1">অবশিষ্ট ব্যালেন্স</p>
                <p className="text-2xl font-black">৳{monthBalance.toLocaleString()}</p>
              </div>
            </div>

            <section>
              <h3 className="text-xl font-black text-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">১. আদায় তালিকা (চাঁদা)</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-16">নং</th>
                    <th>সদস্যের নাম</th>
                    <th>বাড়ির নাম</th>
                    <th className="text-right">পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((sub, idx) => (
                    <tr key={sub.id}>
                      <td className="text-center font-bold">{idx + 1}</td>
                      <td className="font-black">{getMemberName(sub.memberId)}</td>
                      <td>{getMemberHouse(sub.memberId)}</td>
                      <td className="text-right font-black">৳{sub.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-black">
                    <td colSpan={3} className="text-right p-4">মোট আদায়:</td>
                    <td className="text-right p-4">৳{monthTotalIn.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="text-xl font-black text-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">২. ব্যয়ের তালিকা (বাজার ও অন্যান্য)</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-16">নং</th>
                    <th>বিবরণ</th>
                    <th>তারিখ</th>
                    <th className="text-right">পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExps.map((exp, idx) => (
                    <tr key={exp.id}>
                      <td className="text-center font-bold">{idx + 1}</td>
                      <td>
                        <span className="font-black block">{exp.description}</span>
                        <span className="text-[9pt] block opacity-70 italic">{exp.items.map(i => i.name).join(', ')}</span>
                      </td>
                      <td>{exp.date}</td>
                      <td className="text-right font-black">৳{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-black">
                    <td colSpan={3} className="text-right p-4">মোট ব্যয়:</td>
                    <td className="text-right p-4">৳{monthTotalOut.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        )}

        {(printMode === 'collections' || printMode === 'expenses' || printMode === 'members') && (
           <table className="w-full">
             <thead>
               <tr>
                 <th className="text-center w-12">নং</th>
                 <th>{printMode === 'members' ? 'সদস্যের নাম ও বাড়ি' : (printMode === 'collections' ? 'সদস্যের নাম' : 'বিবরণ')}</th>
                 {printMode === 'members' && <th>অবস্থান</th>}
                 <th className="text-right">{printMode === 'members' ? 'মোট দান' : 'পরিমাণ'}</th>
               </tr>
             </thead>
             <tbody>
               {(printMode === 'members' ? memberSummary : (printMode === 'collections' ? filteredSubs : filteredExps)).map((item: any, idx) => (
                 <tr key={item.id}>
                   <td className="text-center font-bold">{idx + 1}</td>
                   <td>
                      <div className="font-black">
                        {printMode === 'members' ? item.name : (printMode === 'collections' ? getMemberName(item.memberId) : item.description)}
                      </div>
                      {printMode === 'members' && <div className="text-[9pt] font-bold text-gray-500 italic">{item.houseName}</div>}
                   </td>
                   {printMode === 'members' && <td>{item.country}</td>}
                   <td className="text-right font-black">
                     ৳{(printMode === 'members' ? item.totalContribution : item.amount).toLocaleString()}
                   </td>
                 </tr>
               ))}
               <tr className="bg-gray-100 font-black">
                  <td colSpan={printMode === 'members' ? 3 : 2} className="text-right p-4 uppercase">সর্বমোট:</td>
                  <td className="text-right p-4">
                    ৳{(printMode === 'members' ? memberSummary.reduce((s,m) => s+m.totalContribution, 0) : (printMode === 'collections' ? monthTotalIn : monthTotalOut)).toLocaleString()}
                  </td>
               </tr>
             </tbody>
           </table>
        )}

        <div className="mt-32 flex justify-between px-16 break-inside-avoid">
          <div className="text-center">
            <div className="w-48 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black text-black uppercase tracking-widest">কোষাধ্যক্ষ</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black text-black uppercase tracking-widest">সভাপতি / সেক্রেটারি</p>
          </div>
        </div>

        <div className="fixed bottom-6 left-0 right-0 text-center text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em] border-t border-gray-100 pt-4">
          রিপোর্ট জেনারেটেড বাই: কালিপুর পাহারাদার ম্যানেজমেন্ট সিস্টেম — তারিখ: {new Date().toLocaleDateString('bn-BD')}
        </div>
      </div>
    </div>
  );
};

export default Reports;
