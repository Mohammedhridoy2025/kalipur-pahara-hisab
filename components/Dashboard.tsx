
import React, { useState, useMemo } from 'react';
import { Member, Subscription, Expense, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// Added CheckCircle2 to the imports from lucide-react to fix the reference error in the Monthly Stats section
import { TrendingUp, TrendingDown, Users, CreditCard, PlusCircle, Wallet, History, FileText, Lock, Calendar, ShoppingBag, ArrowUpRight, ArrowDownRight, ChevronRight, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  members: Member[];
  subscriptions: Subscription[];
  expenses: Expense[];
  onAction: (view: ViewState, action?: string) => void;
  isAdmin: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ members, subscriptions, expenses, onAction, isAdmin }) => {
  const [chartMonth, setChartMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [overviewMonth, setOverviewMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const totalCollections = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalCollections - totalExpenses;

  const monthlyStats = useMemo(() => {
    const income = subscriptions
      .filter(s => s.month === overviewMonth)
      .reduce((sum, s) => sum + s.amount, 0);
    
    const expense = expenses
      .filter(e => e.date.startsWith(overviewMonth))
      .reduce((sum, e) => sum + e.amount, 0);
      
    return { income, expense, balance: income - expense };
  }, [subscriptions, expenses, overviewMonth]);

  const getBengaliMonthName = (monthStr: string) => {
    const [year, monthPart] = monthStr.split('-');
    const months: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
      '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
      '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    return months[monthPart] ? `${months[monthPart]} ${year}` : monthStr;
  };

  const getTrendData = () => {
    const data = [];
    const bnMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    const [yearStr, monthStr] = chartMonth.split('-');
    const refYear = parseInt(yearStr);
    const refMonth = parseInt(monthStr) - 1;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(refYear, refMonth - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const income = subscriptions
        .filter(s => s.month === monthKey)
        .reduce((sum, s) => sum + s.amount, 0);
        
      const expense = expenses
        .filter(e => e.date.startsWith(monthKey))
        .reduce((sum, e) => sum + e.amount, 0);

      data.push({
        name: `${bnMonths[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`,
        collection: income,
        expense: expense
      });
    }
    return data;
  };

  const trendData = getTrendData();

  const quickActions = [
    { label: 'নতুন সদস্য', subLabel: 'সদস্য তালিকা হালনাগাদ', icon: <PlusCircle size={22} />, color: 'text-blue-600', bgColor: 'bg-blue-50', view: 'members', action: 'add-member', adminOnly: true },
    { label: 'চাঁদা আদায়', subLabel: 'রসিদ ও কালেকশন', icon: <Wallet size={22} />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', view: 'collections', adminOnly: false }, 
    { label: 'খরচ এন্ট্রি', subLabel: 'বাজার ও খরচের তালিকা', icon: <TrendingDown size={22} />, color: 'text-rose-600', bgColor: 'bg-rose-50', view: 'expenses', action: 'add-expense', adminOnly: true },
    { label: 'রিপোর্ট', subLabel: 'মাসিক আয়-ব্যয় রিপোর্ট', icon: <FileText size={22} />, color: 'text-amber-600', bgColor: 'bg-amber-50', view: 'reports', adminOnly: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Monthly Overview & Enhanced Quick Access Section */}
      <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
             <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                 <Calendar size={24} />
               </div>
               মাসিক সংক্ষিপ্ত হিসাব
             </h3>
             <p className="text-sm font-bold text-gray-400 mt-1 ml-12">নির্বাচিত মাসের আর্থিক পরিস্থিতির একনজর</p>
          </div>
          
          <div className="relative">
             <input 
               type="month" 
               value={overviewMonth}
               onChange={(e) => setOverviewMonth(e.target.value)}
               className="bg-gray-50 border border-gray-100 text-gray-800 text-sm font-black rounded-2xl px-6 py-3 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-inner transition-all cursor-pointer"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Income Card */}
          <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl p-8 border border-emerald-100/50 shadow-sm relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
               <Wallet size={160} className="text-emerald-900" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest mb-4">
                 <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><ArrowUpRight size={16} /></div> 
                 মোট চাঁদা আদায়
               </div>
               <div className="text-4xl md:text-5xl font-black text-gray-800 tracking-tighter">
                 ৳ {monthlyStats.income.toLocaleString()}
               </div>
               <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-700">
                 <CheckCircle2 size={14} /> {getBengaliMonthName(overviewMonth)} মাসে সংগৃহীত
               </div>
             </div>
          </div>

          {/* Expense Card */}
          <div className="bg-gradient-to-br from-white to-rose-50/30 rounded-3xl p-8 border border-rose-100/50 shadow-sm relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
               <ShoppingBag size={160} className="text-rose-900" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-widest mb-4">
                 <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center"><ArrowDownRight size={16} /></div>
                 মোট খরচ
               </div>
               <div className="text-4xl md:text-5xl font-black text-gray-800 tracking-tighter">
                 ৳ {monthlyStats.expense.toLocaleString()}
               </div>
               <div className="mt-6 flex items-center gap-2 text-xs font-bold text-rose-700">
                 <ShoppingBag size={14} /> বিরিয়ানি, নাস্তা ও অন্যান্য
               </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 flex flex-col sm:flex-row justify-between items-center mb-12 shadow-2xl shadow-slate-200">
           <div className="flex items-center gap-4 mb-4 sm:mb-0">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${monthlyStats.balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
               <CreditCard size={24} />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মাসের বর্তমান স্থিতি</p>
               <h4 className="text-xl font-black text-white">৳ {monthlyStats.balance.toLocaleString()}</h4>
             </div>
           </div>
           <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
             <span className="text-xs font-bold text-slate-300">স্থিতি:</span>
             <span className={`text-sm font-black ${monthlyStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
               {monthlyStats.balance >= 0 ? 'পজিটিভ' : 'নেগেটিভ'}
             </span>
           </div>
        </div>

        {/* Action Buttons Section */}
        <div>
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            দ্রুত নেভিগেশন <div className="h-px flex-1 bg-gray-100"></div>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => {
              const isDisabled = !isAdmin && action.adminOnly;
              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && onAction(action.view as ViewState, action.action)}
                  className={`flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all group relative overflow-hidden ${
                    isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' 
                    : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1'
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all shadow-sm ${action.bgColor} ${action.color} ${!isDisabled && 'group-hover:scale-110 group-hover:rotate-3'}`}>
                    {action.icon}
                  </div>
                  <div className="text-left flex-1">
                    <h5 className="font-black text-gray-800 text-sm">{action.label}</h5>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{action.subLabel}</p>
                  </div>
                  {!isDisabled && <ChevronRight size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all" />}
                  {isDisabled && <Lock size={12} className="text-gray-300" />}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Grid (Lifetime Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="মোট সদস্য" value={members.length.toString()} icon={<Users className="text-blue-600" />} bg="bg-blue-50" />
        <StatCard title="সর্বমোট ফান্ড" value={`৳ ${totalCollections.toLocaleString()}`} icon={<TrendingUp className="text-emerald-600" />} bg="bg-emerald-50" />
        <StatCard title="সর্বমোট খরচ" value={`৳ ${totalExpenses.toLocaleString()}`} icon={<TrendingDown className="text-rose-600" />} bg="bg-rose-50" />
        <StatCard title="বর্তমান ক্যাশ" value={`৳ ${balance.toLocaleString()}`} icon={<CreditCard className="text-amber-600" />} bg="bg-amber-50" />
      </div>

      {/* Chart and History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={18} /></div>
              আয়-ব্যয় গ্রাফ চিত্র
            </h3>
            
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-2 hover:border-emerald-200 transition-all">
               <Calendar size={14} className="text-emerald-600" />
               <input 
                 type="month" 
                 value={chartMonth}
                 onChange={(e) => setChartMonth(e.target.value)}
                 className="bg-transparent border-none text-xs font-black text-gray-700 outline-none cursor-pointer focus:ring-0"
               />
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '25px', fontSize: '11px', fontWeight: 800, color: '#64748b' }} />
                <Bar dataKey="collection" name="আদায়" fill="#10b981" radius={[8, 8, 0, 0]} barSize={25} />
                <Bar dataKey="expense" name="খরচ" fill="#e11d48" radius={[8, 8, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3">
            <div className="p-2 bg-gray-50 text-gray-400 rounded-lg"><History size={18} /></div>
            সাম্প্রতিক খরচ
          </h3>
          <div className="space-y-4">
            {expenses.length > 0 ? expenses.slice(-5).reverse().map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:border-rose-100 transition-all group">
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-800 mb-1 line-clamp-1 group-hover:text-rose-700 transition-colors">{exp.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Calendar size={10} /> {exp.date}
                  </div>
                </div>
                <p className="text-base font-black text-rose-600 ml-4 tracking-tighter">৳{exp.amount.toLocaleString()}</p>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-300 text-sm font-bold italic bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">কোনো খরচের রেকর্ড নেই</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bg }: { title: string, value: string, icon: React.ReactNode, bg: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 transition-all hover:shadow-xl hover:shadow-gray-100 group">
    <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
      {React.cloneElement(icon as React.ReactElement, { size: 28 })}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <p className="text-xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  </div>
);

export default Dashboard;
