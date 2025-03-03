// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ padding: '20px' }}>
      <h1>WebAuthn Polling App</h1>
      <p>Welcome! Please log in or register to create and manage polls.</p>
      <button
        onClick={() => router.push('/login')}
        style={{ margin: '10px', padding: '5px 10px', background: '#0070f3', color: 'white', border: 'none' }}
      >
        Login
      </button>
      <button
        onClick={() => router.push('/register')}
        style={{ margin: '10px', padding: '5px 10px', background: '#0070f3', color: 'white', border: 'none' }}
      >
        Register
      </button>
    </div>
  );
}