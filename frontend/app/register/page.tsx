// app/register/page.tsx
'use client';

import { useState } from 'react';
import { startRegister } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';

const RegisterPage = () => {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { setUser } = useAppStore();
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await startRegister(username);
      const response = await axios.get('http://localhost:8080/api/user', { withCredentials: true });
      const userData = response.data;
      setUser({ username: userData.username, id: userData.id });
      setMessage('Registration successful!');
      router.push('/polls/new');
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 flex flex-col items-center">
      <div className="w-full">
    <Navbar />
  </div>
      <div className="max-w-md w-full mt-16 p-6 bg-[#131328] rounded-lg shadow-lg text-center border border-gray-700">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
          Register with WebAuthn
        </h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full mt-6 p-3 rounded-md bg-[#1e1e2e] text-gray-200 border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
        <button
          onClick={handleRegister}
          className="w-full mt-4 bg-indigo-600 py-3 rounded-md text-white font-medium hover:bg-indigo-700 transition-all duration-300"
        >
          Register
        </button>
        {message && (
          <p className={`mt-4 text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
