
import { LayoutDashboard, Store, Users, ReceiptText } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItem = "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition";
const active = "bg-gray-100 dark:bg-gray-800";

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-64 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4">
        <nav className="space-y-1">
          <NavLink to="/dashboard" className={({isActive}) => `${navItem} ${isActive ? active : ''}`}><LayoutDashboard className="h-4 w-4" /> Dashboard</NavLink>
          <NavLink to="/register-merchant" className={({isActive}) => `${navItem} ${isActive ? active : ''}`}><Store className="h-4 w-4" /> Register Merchant</NavLink>
          
<NavLink to="/customers/new" className={({isActive}) => `${navItem} ${isActive ? active : ''}`}><Users className="h-4 w-4" /> Add Customer</NavLink>
          <NavLink to="/transactions/new" className={({isActive}) => `${navItem} ${isActive ? active : ''}`}><ReceiptText className="h-4 w-4" /> Record Transaction</NavLink>
          <NavLink to="/transactions" className={({isActive}) => `${navItem} ${isActive ? active : ''}`}><ReceiptText className="h-4 w-4" /> Transactions</NavLink>
        

        </nav>
      </div>
    </aside>
  );
}
