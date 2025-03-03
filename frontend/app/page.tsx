'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-5xl font-rajdhani font-bold text-purple-500 mb-6 tracking-wider drop-shadow-lg">
          LEVEL UP YOUR VOICE
        </h1>
        <p className="text-xl font-montserrat text-gray-300 mb-8 max-w-2xl mx-auto">
          Create, vote on, and manage polls with the strength of an S-Rank hunter. Your opinion matters, make it count.
        </p>
        <div className="space-x-6 mt-12">
          <button
            onClick={() => router.push('/login')}
            className="bg-purple-700 text-gray-100 py-3 px-8 rounded hover:bg-purple-600 transition-all duration-300 font-rajdhani font-bold text-lg tracking-wide border-b-4 border-purple-900 hover:translate-y-1 hover:border-b-2"
          >
            LOGIN
          </button>
          <button
            onClick={() => router.push('/register')}
            className="bg-indigo-700 text-gray-100 py-3 px-8 rounded hover:bg-indigo-600 transition-all duration-300 font-rajdhani font-bold text-lg tracking-wide border-b-4 border-indigo-900 hover:translate-y-1 hover:border-b-2"
          >
            REGISTER
          </button>
        </div>
      </div>
    </div>
  );
}