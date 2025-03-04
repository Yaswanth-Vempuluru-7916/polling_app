// app/register/page.tsx
// app/register/page.tsx
'use client';

import { useState } from 'react';
import { startRegister } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const RegisterPage = () => {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await startRegister(username);
      setMessage('Registration successful! Please log in.');
      setTimeout(() => router.push('/login'), 1000);
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] text-gray-100 flex flex-col items-center">
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
        
        {/* Updated Register Button */}
        <button
          onClick={handleRegister}
          className="relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 w-full rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 group font-medium mt-4"
        >
          <span className="relative z-10">Register</span>
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <span className="absolute top-0 left-0 w-full h-0 bg-white/20 group-hover:h-full transition-all duration-300"></span>
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
