import React, { useState, useMemo } from 'react';
import { Member, Subscription, Expense, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, CreditCard, PlusCircle, Wallet, History, FileText, Lock, Calendar, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

  // Monthly Overview Calculations
  const monthlyStats = useMemo(() => {
    const income = subscriptions
      .filter(s => s.month === overviewMonth)
      .reduce((sum, s) => sum + s.amount, 0);
    
    const expense = expenses
      .filter(e => e.date.startsWith(overviewMonth))
      .reduce((sum, e) => sum + e.amount, 0);
      
    return { income, expense, balance: income - expense };
  }, [subscriptions, expenses, overviewMonth]);

  // Bengali Month Name helper
  const getBengaliMonthName = (monthStr: string) => {
    const [year, monthPart] = monthStr.split('-');
    const months: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল',
      '05': 'মে', '06': 'জুন', '07': 'জুলাই', '08': 'আগস্ট',
      '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    return months[monthPart] ? `${months[monthPart]} ${year}` : monthStr;
  };

  // Calculate Last 6 Months Data based on selected chartMonth
  const getTrendData = () => {
    const data = [];
    const bnMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    const [yearStr, monthStr] = chartMonth.split('-');
    const refYear = parseInt(yearStr);
    const refMonth = parseInt(monthStr) - 1; // 0-indexed

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
    { label: 'নতুন সদস্য', icon: <PlusCircle size={24} />, color: 'bg-blue-600', view: 'members', action: 'add-member', adminOnly: true },
    { label: 'চাঁদা আদায়', icon: <Wallet size={24} />, color: 'bg-emerald-600', view: 'collections', adminOnly: false }, 
    { label: 'খরচ এন্ট্রি', icon: <TrendingDown size={24} />, color: 'bg-rose-600', view: 'expenses', action: 'add-expense', adminOnly: true },
    { label: 'রিপোর্ট দেখুন', icon: <FileText size={24} />, color: 'bg-amber-600', view: 'reports', adminOnly: false },
  ];

  return (
    <div className="space-y-8">
      
      {/* Monthly Overview & Quick Access Section */}
      <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-4">
          <div>
             <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
               <Calendar className="text-emerald-600" />
               মাসিক সংক্ষিপ্ত হিসাব
             </h3>
             <p className="text-xs font-bold text-gray-500 mt-1">নির্বাচিত মাসের আয় ও ব্যয়ের হিসাব</p>
          </div>
          
          {/* Month Selector */}
          <div className="relative">
             <input 
               type="month" 
               value={overviewMonth}
               onChange={(e) => setOverviewMonth(e.target.value)}
               className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-black rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
             />
          </div>
        </div>

        {/* The Two Tabs (Income & Expense) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Income Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
               <Wallet size={80} className="text-emerald-600" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase tracking-wider mb-2">
                 <ArrowUpRight size={18} /> মোট চাঁদা আদায়
               </div>
               <div className="text-3xl md:text-4xl font-black text-emerald-800 tracking-tight">
                 ৳ {monthlyStats.income.toLocaleString()}
               </div>
               <p className="text-xs font-bold text-emerald-600 mt-2">
                 {getBengaliMonthName(overviewMonth)} মাসে সংগৃহীত
               </p>
             </div>
          </div>

          {/* Expense Card */}
          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-6 border border-rose-100 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
               <ShoppingBag size={80} className="text-rose-600" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-wider mb-2">
                 <ArrowDownRight size={18} /> মোট খরচ
               </div>
               <div className="text-3xl md:text-4xl font-black text-rose-800 tracking-tight">
                 ৳ {monthlyStats.expense.toLocaleString()}
               </div>
               <p className="text-xs font-bold text-rose-600 mt-2">
                 বিরিয়ানি, নাস্তা ও অন্যান্য খরচ
               </p>
             </div>
          </div>
        </div>

        {/* Current Month Balance Strip */}
        <div className="bg-gray-800 text-white rounded-xl p-4 flex justify-between items-center mb-8 shadow-lg">
           <span className="text-sm font-bold opacity-80 uppercase tracking-widest">মাসের বর্তমান স্থিতি</span>
           <span className={`text-xl font-black ${monthlyStats.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             ৳ {monthlyStats.balance.toLocaleString()}
           </span>
        </div>

        {/* Action Buttons */}
        <div>
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">কুইক অ্যাকসেস মেনু</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => {
              const isDisabled = !isAdmin && action.adminOnly;
              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && onAction(action.view as ViewState, action.action)}
                  className={`flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-gray-100 transition-all group relative ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-blue-100 hover:shadow-md hover:-translate-y-1'}`}
                >
                  {isDisabled && (
                    <div className="absolute top-2 right-2 text-gray-400">
                      <Lock size={12} />
                    </div>
                  )}
                  <div className={`${action.color} text-white p-3 rounded-xl mb-2 ${!isDisabled && 'group-hover:scale-110'} transition-transform shadow-md`}>
                    {action.icon}
                  </div>
                  <span className="font-bold text-gray-700 text-xs md:text-sm">{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Grid (Lifetime Totals) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="মোট সদস্য" value={members.length.toString()} icon={<Users className="text-blue-600" />} bg="bg-blue-50" />
        <StatCard title="সর্বমোট ফান্ড" value={`৳ ${totalCollections.toLocaleString()}`} icon={<TrendingUp className="text-emerald-600" />} bg="bg-emerald-50" />
        <StatCard title="সর্বমোট খরচ" value={`৳ ${totalExpenses.toLocaleString()}`} icon={<TrendingDown className="text-rose-600" />} bg="bg-rose-50" />
        <StatCard title="বর্তমান ক্যাশ" value={`৳ ${balance.toLocaleString()}`} icon={<CreditCard className="text-amber-600" />} bg="bg-amber-50" />
      </div>

      {/* Chart and History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" />
              আয়-ব্যয় চিত্র
            </h3>
            
            {/* Month Selector for Chart */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm hover:border-emerald-200 transition-colors">
               <Calendar size={14} className="text-emerald-600" />
               <span className="text-xs font-bold text-gray-500 hidden sm:inline">শেষ মাস:</span>
               <input 
                 type="month" 
                 value={chartMonth}
                 onChange={(e) => setChartMonth(e.target.value)}
                 className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none cursor-pointer focus:ring-0 w-28 sm:w-auto"
               />
            </div>
          </div>
          
          <div className="h-[300px] w-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 13, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 12, fontWeight: 500}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#1f2937' }}
                  itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', color: '#374151' }} />
                <Bar dataKey="collection" name="আদায়" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="খরচ" fill="#e11d48" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History size={20} className="text-gray-500" />
            সাম্প্রতিক খরচ
          </h3>
          <div className="space-y-4">
            {expenses.length > 0 ? expenses.slice(-5).reverse().map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{exp.description}</p>
                  <p className="text-xs font-medium text-gray-500">{exp.date}</p>
                </div>
                <p className="text-base font-black text-rose-600">৳{exp.amount.toLocaleString()}</p>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 text-sm font-medium italic">কোনো খরচের রেকর্ড নেই</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bg }: { title: string, value: string, icon: React.ReactNode, bg: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5 transition-transform hover:-translate-y-1">
    <div className={`p-4 rounded-2xl ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;