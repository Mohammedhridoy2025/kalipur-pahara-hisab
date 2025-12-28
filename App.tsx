
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Member, Subscription, Expense, TrashRecord, AppNotification } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MemberManager from './components/MemberManager';
import CollectionManager from './components/CollectionManager';
import ExpenseManager from './components/ExpenseManager';
import DefaulterManager from './components/DefaulterManager';
import Reports from './components/Reports';
import TrashBin from './components/TrashBin';
import { Menu, X, Cloud, RefreshCw, Lock, Unlock, LogIn, LogOut, XCircle, User, Bell, CheckCircle2, AlertTriangle, Info, Loader2, ShieldCheck } from 'lucide-react';
import { membersCol, subscriptionsCol, expensesCol, trashCol, auth } from './services/firebase';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(() => {
    return (localStorage.getItem('appActiveView') as ViewState) || 'dashboard';
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trashRecords, setTrashRecords] = useState<TrashRecord[]>([]);
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [preSelectedMemberId, setPreSelectedMemberId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const logoutTimerRef = useRef<any>(null);

  const handleViewChange = (view: ViewState) => {
    setActiveView(view);
    localStorage.setItem('appActiveView', view);
    setIsMobileMenuOpen(false);
  };

  const addNotification = (type: AppNotification['type'], title: string, message: string) => {
    const id = Date.now().toString();
    const newNotification: AppNotification = { id, type, title, message };
    setNotifications(prev => [newNotification, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdmin(!!user);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // Increased to 24 hours as requested to avoid frequent logout
    const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; 
    
    const performAutoLogout = async () => {
      try {
        await auth.signOut();
        handleViewChange('dashboard');
        addNotification('warning', 'নিরাপত্তা সতর্কতা', 'দীর্ঘক্ষণ ব্যবহারের পর আপনার সেশন শেষ হয়েছে।');
      } catch (error) {
        console.error("Auto logout error", error);
      }
    };
    
    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(performAutoLogout, INACTIVITY_LIMIT);
    };
    
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    resetTimer();
    activityEvents.forEach(event => document.addEventListener(event, resetTimer));
    
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      activityEvents.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAdmin]);

  useEffect(() => {
    setIsSyncing(true);
    const unsubMembers = membersCol.onSnapshot((snapshot) => {
      const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(membersList);
      setIsSyncing(false);
    }, (error) => {
      console.error("Firebase Sync Error (Members):", error);
      setIsSyncing(false);
    });
    const unsubSubs = subscriptionsCol.onSnapshot((snapshot) => {
      const subsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
      setSubscriptions(subsList.sort((a, b) => b.date.localeCompare(a.date)));
    }, (error) => {
      console.error("Firebase Sync Error (Subscriptions):", error);
    });
    const unsubExpenses = expensesCol.onSnapshot((snapshot) => {
      const expList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expList.sort((a, b) => b.date.localeCompare(a.date)));
    }, (error) => {
      console.error("Firebase Sync Error (Expenses):", error);
    });
    const unsubTrash = trashCol.onSnapshot((snapshot) => {
      const trashList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrashRecord));
      setTrashRecords(trashList.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)));
    }, (error) => {
      console.error("Firebase Sync Error (Trash):", error);
    });
    return () => {
      unsubMembers();
      unsubSubs();
      unsubExpenses();
      unsubTrash();
    };
  }, []);

  const totalCollections = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalCollections - totalExpenses;

  const handleQuickAction = (view: ViewState, action?: string) => {
    handleViewChange(view);
    if (action) setInitialAction(action);
  };

  const handleQuickSubscription = (memberId: string) => {
    setPreSelectedMemberId(memberId);
    handleViewChange('collections');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanUsername = loginUsername.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();
    const email = cleanUsername === 'admin' ? 'admin@kalipur.com' : cleanUsername;
    try {
      await auth.signInWithEmailAndPassword(email, cleanPassword);
      setIsLoginModalOpen(false);
      setLoginUsername('');
      setLoginPassword('');
      addNotification('success', 'লগইন সফল', 'অ্যাডমিন প্যানেলে স্বাগতম');
    } catch (error: any) {
      if (cleanUsername === 'admin' && error.code === 'auth/user-not-found') {
        try {
          await auth.createUserWithEmailAndPassword(email, cleanPassword);
          setIsLoginModalOpen(false);
          addNotification('success', 'অ্যাডমিন তৈরি হয়েছে', 'লগইন সফল');
          return;
        } catch (createErr) {}
      }
      setLoginError('ভুল ইউজারনেম বা পাসওয়ার্ড!');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      handleViewChange('dashboard');
      addNotification('info', 'লগআউট', 'আপনি সফলভাবে লগআউট করেছেন');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard members={members} subscriptions={subscriptions} expenses={expenses} onAction={handleQuickAction} isAdmin={isAdmin} />;
      case 'members':
        return <MemberManager members={members} subscriptions={subscriptions} setMembers={() => {}} initialOpen={initialAction === 'add-member'} onCloseModal={() => setInitialAction(null)} onAddSubscription={handleQuickSubscription} isAdmin={isAdmin} />;
      case 'collections':
        return <CollectionManager members={members} subscriptions={subscriptions} setSubscriptions={() => {}} initialMemberId={preSelectedMemberId || undefined} onClearPreSelection={() => setPreSelectedMemberId(null)} isAdmin={isAdmin} addNotification={addNotification} />;
      case 'defaulters':
        return <DefaulterManager members={members} subscriptions={subscriptions} onAddSubscription={handleQuickSubscription} />;
      case 'expenses':
        return <ExpenseManager expenses={expenses} setExpenses={() => {}} initialOpen={initialAction === 'add-expense'} onCloseModal={() => setInitialAction(null)} isAdmin={isAdmin} addNotification={addNotification} />;
      case 'reports':
        return <Reports members={members} subscriptions={subscriptions} expenses={expenses} />;
      case 'trash':
        return <TrashBin trashRecords={trashRecords} members={members} isAdmin={isAdmin} />;
      default:
        return <Dashboard members={members} subscriptions={subscriptions} expenses={expenses} onAction={handleQuickAction} isAdmin={isAdmin} />;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
         <div className="bg-white p-8 rounded-[2rem] shadow-xl flex flex-col items-center animate-pulse">
            <ShieldCheck size={48} className="text-emerald-600 mb-4" />
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">কালিপুর পাহারাদার</h2>
            <div className="flex items-center gap-2 mt-4 text-emerald-600 font-bold">
               <Loader2 className="animate-spin" size={20} />
               <span>সিস্টেম লোড হচ্ছে...</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {notifications.map((note) => (
          <div key={note.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border-l-4 w-80 animate-in slide-in-from-right-10 duration-300 backdrop-blur-md ${note.type === 'success' ? 'bg-white/95 border-emerald-500 text-emerald-900' : note.type === 'alert' ? 'bg-rose-50 border-rose-600 text-rose-900' : note.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-white/95 border-blue-500 text-blue-900'}`}>
             <div className="mt-0.5">
               {note.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
               {note.type === 'alert' && <AlertTriangle size={18} className="text-rose-600" />}
               {note.type === 'warning' && <AlertTriangle size={18} className="text-amber-600" />}
               {note.type === 'info' && <Info size={18} className="text-blue-600" />}
             </div>
             <div className="flex-1">
               <h4 className="font-black text-sm">{note.title}</h4>
               <p className="text-xs font-medium opacity-90 mt-0.5 leading-relaxed">{note.message}</p>
             </div>
             <button onClick={() => removeNotification(note.id)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
          </div>
        ))}
      </div>

      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold animate-pulse no-print">
          <RefreshCw size={16} className="animate-spin" />
          <Cloud size={18} /> <span>ডাটা সিনক্রোনাইজ হচ্ছে...</span>
        </div>
      )}

      <div className="md:hidden bg-white p-4 flex justify-between items-center border-b border-gray-100 no-print">
        <div className="font-bold text-emerald-700 flex items-center gap-2">
           <span className="text-2xl">🛡️</span> কালিপুর
        </div>
        <div className="flex gap-2">
           {!isAdmin && <button onClick={() => setIsLoginModalOpen(true)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><LogIn size={20} /></button>}
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-emerald-600">{isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
      </div>

      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block no-print`}>
         <Sidebar activeView={activeView} setActiveView={handleViewChange} balance={balance} isAdmin={isAdmin} onLogin={() => setIsLoginModalOpen(true)} onLogout={handleLogout} />
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-emerald-800 tracking-tight">কালিপুর পাহারাদার ম্যানেজমেন্ট</h1>
            <p className="text-sm md:text-base text-gray-500 font-medium">আর্থিক সহযোগিতায় কালিপুর গ্রামের প্রবাসীগন</p>
          </div>
          <div className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl shadow-sm border self-start md:self-center cursor-pointer transition-all ${isAdmin ? 'bg-rose-50 border-rose-100' : 'bg-white border-emerald-50'}`} onClick={() => !isAdmin ? setIsLoginModalOpen(true) : handleLogout()}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${isAdmin ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'}`}>{isAdmin ? <Unlock size={20} /> : <Lock size={20} />}</div>
            <div>
              <p className={`text-xs md:text-sm font-black uppercase tracking-wider ${isAdmin ? 'text-rose-700' : 'text-gray-700'}`}>{isAdmin ? 'অ্যাডমিন মোড চালু' : 'ভিউ অনলি মোড'}</p>
              <p className="text-[10px] md:text-xs text-gray-400 font-bold">{isAdmin ? 'লগআউট করতে ক্লিক করুন' : 'লগইন করতে ক্লিক করুন'}</p>
            </div>
          </div>
        </header>
        {renderView()}
      </main>

      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3"><Lock size={32} /></div>
              <h3 className="text-xl font-black text-gray-800">অ্যাডমিন লগইন</h3>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" placeholder="ইউজারনেম" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
              <input type="password" placeholder="পাসওয়ার্ড" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              {loginError && <p className="text-rose-500 text-xs font-bold text-center mt-2">{loginError}</p>}
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all">লগইন করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
