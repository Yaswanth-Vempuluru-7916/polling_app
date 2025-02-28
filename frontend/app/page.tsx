'use client'
import { startAuth, startRegister } from '@/lib/auth';
import { useState } from 'react';


export default function Home() {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleRegister = async () => {
    try {
      await startRegister(username);
      setMessage('Registration successful!');
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  const handleLogin = async () => {
    try {
      await startAuth(username);
      setMessage('Authentication successful!');
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>WebAuthn Testing</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
      />
      <br />
      <button onClick={handleRegister} style={{ margin: '10px' }}>
        Register
      </button>
      <button onClick={handleLogin}>Login</button>
      <p>{message}</p>
    </div>
  );
}