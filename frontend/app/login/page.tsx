// app/login/page.tsx
'use client';

import { useState } from 'react';
import { startAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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
      router.push('/polls/new');
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Login with WebAuthn</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
        style={{ marginBottom: '10px', padding: '5px' }}
      />
      <br />
      <button
        onClick={handleLogin}
        style={{ margin: '10px', padding: '5px 10px', background: '#0070f3', color: 'white', border: 'none' }}
      >
        Login
      </button>
      <p>{message}</p>
    </div>
  );
};

export default LoginPage;