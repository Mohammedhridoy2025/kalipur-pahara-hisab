import React, { useState, useMemo } from 'react';
import { Expense, ExpenseItem, AppNotification } from '../types';
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, ShoppingBag, Calendar, FileText, ShoppingCart, PlusCircle, Trash, CheckCircle2, Utensils, Coffee, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { db, expensesCol, trashCol } from '../services/firebase';

interface ExpenseManagerProps {
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  initialOpen?: boolean;
  onCloseModal?: () => void;
  isAdmin: boolean;
  addNotification?: (type: AppNotification['type'], title: string, message: string) => void;
}

type SortKey = 'description' | 'amount' | 'date';

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, initialOpen, onCloseModal, isAdmin, addNotification }) => {
  const [isModalOpen, setIsModalOpen] = useState(initialOpen || false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: SortKey, direction: 'asc' | 'desc'}>({ key: 'date', direction: 'desc' });
  
  // Custom Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<Expense['category']>('Biriyani');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', name: '', amount: 0 }
  ]);

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + (item.amount || 0), 0), [items]);

  const addItem = () => setItems([...items, { id: Date.now().toString(), name: '', amount: 0 }]);
  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));
  const updateItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handlePreset = (type: 'biriyani' | 'salary' | 'snacks') => {
    if (type === 'biriyani') {
      setCategory('Biriyani');
      setDescription('বিরিয়ানি বাজার');
      setItems([
        { id: '1', name: 'চাল', amount: 0 },
        { id: '2', name: 'মুরগি/গরু', amount: 0 },
        { id: '3', name: 'মসলাপাতি', amount: 0 },
        { id: '4', name: 'অন্যান্য', amount: 0 },
      ]);
    } else if (type === 'salary') {
      setCategory('Salary');
      setDescription('বেতন ও ভাতা');
      setItems([{ id: '1', name: 'মাসিক বেতন', amount: 0 }]);
    } else if (type === 'snacks') {
      setCategory('Snacks');
      setDescription('নাস্তা ও আপ্যায়ন');
      setItems([{ id: '1', name: 'চা ও বিস্কুট', amount: 0 }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);
    
    try {
      // Logic for Notification trigger for large expenses (> 5000 BDT)
      if (totalAmount > 5000 && addNotification) {
         addNotification(
           'alert', 
           'বড় খরচের সতর্কতা', 
           `একটি বড় অঙ্কের খরচ (৳${totalAmount.toLocaleString()}) যুক্ত করা হয়েছে।`
         );
      } else if (addNotification) {
         addNotification('success', 'খরচ যোগ হয়েছে', 'খরচের হিসাব সফলভাবে সেভ করা হয়েছে।');
      }

      const expenseData = {
        category,
        description,
        amount: totalAmount,
        date,
        items: items.filter(i => i.name && i.amount > 0)
      };

      await expensesCol.add(expenseData);
      
      // Reset
      setDescription('');
      setCategory('Biriyani');
      setItems([{ id: '1', name: '', amount: 0 }]);
      setIsModalOpen(false);
      onCloseModal?.();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("খরচ সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !isAdmin) return;
    setIsDeleting(confirmDeleteId);
    
    try {
      const docRef = db.collection("expenses").doc(confirmDeleteId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        await trashCol.add({
          originalId: confirmDeleteId,
          type: 'expense',
          data: { ...docSnap.data(), id: confirmDeleteId },
          deletedAt: new Date().toISOString()
        });
        await docRef.delete();
        if (addNotification) addNotification('info', 'রেকর্ড ডিলিট', 'খরচের রেকর্ডটি রিসাইকেল বিনে পাঠানো হয়েছে।');
      }
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      if (error.code === 'permission-denied') {
        alert("পারমিশন নেই। অনুগ্রহ করে ফায়ারবেস রুলস চেক করুন।");
      } else {
        alert("মুছে ফেলতে সমস্যা হয়েছে।");
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedExpenses = useMemo(() => {
    let items = [...expenses];
    items.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [expenses, sortConfig]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />;
  };

  return (
    <div className="space-y-8">
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ShoppingBag size={28} />
          </div>
          <div>
             <h2 className="text-2xl font-black text-gray-800">খরচের হিসাব</h2>
             <p className="text-sm font-bold text-gray-500">মোট খরচ: <span className="text-rose-600">৳{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span></p>
          </div>
        </div>
        
        {isAdmin ? (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-2"
          >
            <PlusCircle size={20} /> নতুন খরচ যোগ
          </button>
        ) : (
          <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs flex items-center gap-2">
            <Lock size={16} /> অ্যাডমিন এক্সেস প্রয়োজন
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden no-print">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-black text-gray-600 uppercase tracking-widest border-b border-gray-200">
                <tr>
                   <th className="px-8 py-5 cursor-pointer" onClick={() => handleSort('description')}>বিবরণ <SortIcon column="description" /></th>
                   <th className="px-8 py-5 cursor-pointer" onClick={() => handleSort('date')}>তারিখ <SortIcon column="date" /></th>
                   <th className="px-8 py-5 text-right cursor-pointer" onClick={() => handleSort('amount')}>পরিমাণ <SortIcon column="amount" /></th>
                   {isAdmin && <th className="px-8 py-5 text-right">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {sortedExpenses.map(expense => (
                   <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                         <div className="font-black text-gray-800 text-base">{expense.description}</div>
                         <div className="flex gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              expense.category === 'Biriyani' ? 'bg-rose-50 text-rose-600' : 
                              expense.category === 'Salary' ? 'bg-blue-50 text-blue-600' :
                              expense.category === 'Snacks' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {expense.category}
                            </span>
                            {expense.items.length > 0 && (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <ShoppingCart size={10} /> {expense.items.length} টি আইটেম
                              </span>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-500">{expense.date}</td>
                      <td className="px-8 py-5 text-right font-black text-rose-600 text-lg">৳{expense.amount.toLocaleString()}</td>
                      {isAdmin && (
                        <td className="px-8 py-5 text-right">
                           <button 
                             onClick={() => setConfirmDeleteId(expense.id)}
                             disabled={isDeleting === expense.id}
                             className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                           >
                              {isDeleting === expense.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                           </button>
                        </td>
                      )}
                   </tr>
                 ))}
                 {sortedExpenses.length === 0 && (
                   <tr>
                     <td colSpan={isAdmin ? 4 : 3} className="px-8 py-12 text-center text-gray-400 font-bold italic">কোনো খরচের রেকর্ড নেই</td>
                   </tr>
                 )}
              </tbody>
            </table>
         </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[200] no-print">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-2xl shadow-2xl relative animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto border border-gray-100">
             <button onClick={() => { setIsModalOpen(false); onCloseModal?.(); }} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
               <XCircle size={24} />
             </button>

             <div className="mb-8">
               <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                 <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><ShoppingBag size={24} /></div>
                 নতুন খরচ এন্ট্রি
               </h3>
               <p className="text-gray-500 font-bold ml-[3.25rem] mt-1 text-sm">তহবিলের খরচের সঠিক হিসাব রাখুন</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">তারিখ</label>
                    <input 
                      type="date" 
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">ক্যাটাগরি</label>
                    <select 
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                    >
                      <option value="Biriyani">বিরিয়ানি / খানাপিনা</option>
                      <option value="Salary">বেতন / ভাতা</option>
                      <option value="Snacks">নাস্তা / আপ্যায়ন</option>
                      <option value="Others">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                   <button type="button" onClick={() => handlePreset('biriyani')} className="px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-colors border border-rose-100">বিরিয়ানি সেটআপ</button>
                   <button type="button" onClick={() => handlePreset('salary')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-colors border border-blue-100">বেতন সেটআপ</button>
                   <button type="button" onClick={() => handlePreset('snacks')} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-amber-100 transition-colors border border-amber-100">নাস্তা সেটআপ</button>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2">বিবরণ</label>
                   <input 
                      type="text" 
                      placeholder="খরচের বিবরণ (যেমন: জানুয়ারির বাজার)"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required
                    />
                </div>

                {/* Items List */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest">আইটেমসমূহ</label>
                      <button type="button" onClick={addItem} className="text-rose-600 font-bold text-xs flex items-center gap-1 hover:bg-rose-100 px-2 py-1 rounded-md transition-colors"><Plus size={14} /> নতুন আইটেম</button>
                   </div>
                   
                   {items.map((item, idx) => (
                     <div key={item.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                        <input 
                          type="text" 
                          placeholder="আইটেমের নাম"
                          className="flex-1 p-3 bg-white border border-gray-200 rounded-lg font-bold text-gray-700 text-sm outline-none focus:border-rose-400"
                          value={item.name}
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="টাকা"
                          className="w-24 p-3 bg-white border border-gray-200 rounded-lg font-bold text-gray-900 text-sm outline-none focus:border-rose-400 text-right"
                          value={item.amount || ''}
                          onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))}
                        />
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(item.id)} className="p-3 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                             <Trash size={16} />
                          </button>
                        )}
                     </div>
                   ))}
                   
                   <div className="border-t border-gray-200 pt-3 flex justify-end items-center gap-3">
                      <span className="text-sm font-bold text-gray-500 uppercase">সর্বমোট:</span>
                      <span className="text-2xl font-black text-rose-600">৳{totalAmount.toLocaleString()}</span>
                   </div>
                </div>

                <div className="pt-2">
                   <button 
                     type="submit" 
                     disabled={isSubmitting || totalAmount <= 0 || !description}
                     className="w-full py-5 bg-rose-600 text-white rounded-xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                   >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                      {isSubmitting ? 'সেভ হচ্ছে...' : 'খরচ নিশ্চিত করুন'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[300] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">খরচ রেকর্ড মুছতে চান?</h3>
              <p className="text-gray-500 font-medium text-sm mb-8">
                এটি রিসাইকেল বিনে পাঠানো হবে। আপনি চাইলে পরে রিস্টোর করতে পারবেন।
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
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;