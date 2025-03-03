// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to the Polling App</h1>
        <p className="text-lg text-gray-600 mb-6">
          Create, vote on, and manage polls with ease. Log in or register to get started!
        </p>
        <div className="space-x-4">
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/register')}
            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}