
import { Moon, Sun, LogOut } from 'lucide-react';
import { Link } from "react-router-dom";
import Button from '../ui/Button';
import { useAuth } from '../../auth/AuthContext';
import { useEffect, useState } from 'react';

export default function Topbar() {
  const { email, logout } = useAuth();
  const [dark, setDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">

        <Link to="/dashboard"
          className="font-semibold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-sm"
          aria-label="Go to Dashboard">
          Merchant Admin Portal
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="text-sm text-gray-500 dark:text-gray-400 mr-2">{email}</div>
          <Button variant="secondary" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
        </div>
      </div>
    </header>
  );
}
