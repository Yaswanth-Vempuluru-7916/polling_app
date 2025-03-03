'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '12s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '10s'}}></div>
      </div>
      
      <Navbar />
      
      <div className={`max-w-4xl mx-auto p-6 text-center relative z-20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>


        <h1 className="text-5xl font-bold mb-6 animate-text bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
          Welcome to the Polling App
        </h1>
        <p className={`text-xl text-gray-300 mb-10 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Create, vote on, and manage polls with ease. Log in or register to get started!
        </p>
        <div className={`space-x-6 transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => router.push('/login')}
            className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-indigo-600 text-white py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 group font-medium"
          >
            <span className="relative z-10">Login</span>
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="absolute top-0 left-0 w-full h-0 bg-white/20 group-hover:h-full transition-all duration-300"></span>
          </button>
          <button
            onClick={() => router.push('/register')}
            className="relative overflow-hidden bg-gradient-to-r from-[#1e1e2e] to-[#2e2e3e] text-cyan-300 py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 border border-cyan-800/50 group font-medium"
          >
            <span className="relative z-10">Register</span>
            <span className="absolute inset-0 bg-gradient-to-r from-[#2e2e3e] to-[#3e3e4e] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="absolute top-0 left-0 w-full h-0 bg-white/10 group-hover:h-full transition-all duration-300"></span>
          </button>
        </div>
      </div>
    </div>
  );
}