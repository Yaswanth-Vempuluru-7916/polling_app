// app/login/page.tsx
'use client';

import { useState } from 'react';
import { startAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';

const LoginPage = () => {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { setUser } = useAppStore();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await startAuth(username);
      const response = await axios.get('http://localhost:8080/api/user', { withCredentials: true });
      const userData = response.data;
      setUser({ username: userData.username, id: userData.id });
      console.log('User set in store:', useAppStore.getState().user);
      setMessage('Authentication successful!');
      const intendedPath = document.referrer.includes('/polls/manage') ? '/polls/manage' : '/polls/new';
      router.push(intendedPath);
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-md mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Login with WebAuthn</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Login
        </button>
        {message && <p className={`mt-4 text-center ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
      </div>
    </div>
  );
};

export default LoginPage;