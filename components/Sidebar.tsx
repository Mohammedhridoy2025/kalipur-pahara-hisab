import React from 'react';
import { ViewState } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Receipt, 
  FileBarChart, 
  ShieldCheck,
  Trash2,
  LogIn,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  balance: number;
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, balance, isAdmin, onLogin, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard size={20} /> },
    { id: 'members', label: 'সদস্য তালিকা', icon: <Users size={20} /> },
    { id: 'collections', label: 'চাঁদা আদায়', icon: <Wallet size={20} /> },
    { id: 'expenses', label: 'খরচের হিসাব', icon: <Receipt size={20} /> },
    { id: 'reports', label: 'রিপোর্ট', icon: <FileBarChart size={20} /> },
  ];

  // Trash only visible to admins
  if (isAdmin) {
    menuItems.push({ id: 'trash', label: 'রিসাইকেল বিন', icon: <Trash2 size={20} /> });
  }

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 h-screen sticky top-0 no-print flex flex-col overflow-y-auto">
      <div className="p-6 flex items-center gap-3 text-emerald-600">
        <ShieldCheck size={32} />
        <span className="font-bold text-xl tracking-tight">কালিপুর</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as ViewState)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeView === item.id 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-3 border-t border-gray-100 mt-auto">
        <div className="bg-emerald-600 rounded-xl p-4 text-white">
          <p className="text-xs opacity-80 mb-1">মোট ব্যালেন্স</p>
          <p className="text-lg font-bold">৳ {balance.toLocaleString()}</p>
        </div>

        {isAdmin ? (
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-100">
            <LogOut size={16} /> লগআউট
          </button>
        ) : (
          <button onClick={onLogin} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
            <LogIn size={16} /> অ্যাডমিন লগইন
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;