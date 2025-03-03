// app/polls/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchUserPolls, closePoll, resetPoll, logout } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const PollManagePage = () => {
  const router = useRouter();
  const { user, polls, setPolls, setUser } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(() => {
      setIsHydrating(false);
    });
    setTimeout(() => setIsHydrating(false), 100);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isHydrating && !user) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('http://localhost:8080/api/user', { withCredentials: true });
          setUser({ username: response.data.username, id: response.data.id });
        } catch (err) {
          router.push('/login');
        }
      };
      fetchUser();
    }
  }, [user, router, setUser, isHydrating]);

  useEffect(() => {
    if (!isHydrating && !user) return;
    const loadPolls = async () => {
      try {
        const userPolls = await fetchUserPolls();
        setPolls(userPolls);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your polls.');
      } finally {
        setLoading(false);
      }
    };
    loadPolls();
  }, [user, router, setPolls, isHydrating]);

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close poll.');
    }
  };

  const handleResetPoll = async (pollId: string) => {
    try {
      await resetPoll(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset poll.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout.');
    }
  };

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (!user) return null;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Your Polls</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-500 text-white py-1 px-3 rounded hover:bg-gray-600"
        >
          Logout
        </button>
      </div>
      {polls.length === 0 ? (
        <p className="text-gray-500">You haven’t created any polls yet.</p>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="border p-3 rounded-md">
              <h2 className="text-lg font-semibold">{poll.title}</h2>
              <p className="text-gray-600">Status: {poll.isClosed ? 'Closed' : 'Open'}</p>
              <div className="mt-2 space-x-2">
                {!poll.isClosed && (
                  <button
                    onClick={() => handleClosePoll(poll.id)}
                    className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
                  >
                    Close Poll
                  </button>
                )}
                <button
                  onClick={() => handleResetPoll(poll.id)}
                  className="bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600"
                >
                  Reset Votes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PollManagePage;