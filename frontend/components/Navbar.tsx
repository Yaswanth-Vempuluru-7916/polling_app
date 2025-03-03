// components/Navbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { useAppStore } from '@/lib/store';

const Navbar = () => {
  const router = useRouter();
  const { user } = useAppStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">Polling App</div>
        <div className="space-x-4">
          <button
            onClick={() => router.push('/')}
            className="hover:text-gray-300 focus:outline-none"
          >
            Home
          </button>
          {user && (
            <>
              <button
                onClick={() => router.push('/polls/new')}
                className="hover:text-gray-300 focus:outline-none"
              >
                Create Poll
              </button>
              <button
                onClick={() => router.push('/polls/manage')}
                className="hover:text-gray-300 focus:outline-none"
              >
                Manage Polls
              </button>
              <button
                onClick={handleLogout}
                className="hover:text-gray-300 focus:outline-none"
              >
                Logout
              </button>
            </>
          )}
          {!user && (
            <button
              onClick={() => router.push('/login')}
              className="hover:text-gray-300 focus:outline-none"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;