// app/polls/[pollId]/results/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPoll } from '@/lib/api';
import { useAppStore, Poll } from '@/lib/store';
import Navbar from '@/components/Navbar';
import axios from 'axios';

const PollResultsPage = () => {
  const { pollId } = useParams();
  const { user, updatePoll, setUser } = useAppStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(() => {
      setIsHydrating(false);
    });
    setTimeout(() => setIsHydrating(false), 100);
    return () => unsubscribe();
  }, []);

  // Sync user state on mount with retry
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/user', { withCredentials: true });
        setUser({ username: response.data.username, id: response.data.id });
        console.log('Session synced for user:', response.data.username);
      } catch (err) {
        console.error('Session check failed:', err);
        router.push('/login');
      }
    };
    if (!isHydrating && !user) {
      checkSession();
    }
  }, [isHydrating, user, router, setUser]);

  useEffect(() => {
    if (!isHydrating && !user) {
      router.push('/login');
    }
  }, [router, isHydrating, user]);

  // Fetch initial poll data
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollData = await getPoll(pollId as string);
        setPoll(pollData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load poll results.');
      } finally {
        setLoading(false);
      }
    };
    if (!isHydrating && user) {
      fetchPoll();
    }
  }, [pollId, isHydrating, user]);

  // WebSocket for live updates
  useEffect(() => {
    if (isHydrating || !pollId || !user) return;

    const ws = new WebSocket('ws://localhost:8080/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to WebSocket for poll ${pollId} as user ${user.username}`);
      ws.send(`join_poll:${pollId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const updatedPoll: Poll = {
          ...data,
          id: data._id?.$oid || data.id || '',
          _id: data._id || undefined,
        };
        if (!updatedPoll.id) {
          console.error('Received poll with no valid ID:', updatedPoll);
          return;
        }
        if (updatedPoll.id === pollId) {
          console.log('Received WebSocket update for poll:', updatedPoll.id);
          setPoll(updatedPoll);
          updatePoll(updatedPoll);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      // Don’t redirect here; let session check handle it
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      wsRef.current = null;
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isHydrating, pollId, user, router, updatePoll]);

  if (isHydrating || loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!poll) return <div className="text-center p-4">Poll not found.</div>;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] overflow-hidden relative">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] text-gray-200 rounded-lg shadow-lg border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
          {poll.title} - Live Results
        </h1>
        <div className="space-y-4">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            return (
              <div key={option.id} className="p-3 rounded-md border border-gray-700">
                <div className="flex justify-between mb-2">
                  <span>{option.text}</span>
                  <span>{option.votes} votes ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-gray-400">Total Votes: {totalVotes}</p>
        {poll.isClosed && <p className="text-gray-500 mt-2">This poll is closed.</p>}
      </div>
    </div>
  );
};

export default PollResultsPage;