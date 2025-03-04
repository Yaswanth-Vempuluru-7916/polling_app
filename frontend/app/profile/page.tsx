'use client';

import { useState, useEffect } from 'react';
import { fetchUserPolls } from '@/lib/api';
import { useAppStore, Poll } from '@/lib/store';
import PollCard from '@/components/polls/PollCard';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

const ProfilePage = () => {
  const router = useRouter();
  const { user } = useAppStore();
  const [polls, setPolls] = useState<Poll[]>([]);
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
      router.push('/login');
    }
  }, [user, router, isHydrating]);

  useEffect(() => {
    if (!isHydrating && user) {
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
    }
  }, [user, isHydrating]);

  useEffect(() => {
    if (!isHydrating && user && polls.length > 0) {
      const ws = new WebSocket('ws://localhost:8080/ws');
      ws.onopen = () => {
        console.log('Connected to WebSocket for profile');
        polls.forEach((poll) => ws.send(`join_poll:${poll.id}`));
      };
      ws.onmessage = (event) => {
        const updatedPoll: Poll = JSON.parse(event.data);
        setPolls((prevPolls) =>
          prevPolls.map((p) => (p.id === updatedPoll.id ? updatedPoll : p))
        );
      };
      ws.onerror = (err: Event) => console.error('WebSocket error:', err);
      return () => {
        ws.close();
      };
    }
  }, [isHydrating, user, polls.length]);

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (!user) return null;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-400 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] text-gray-200">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 mt-8 bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.8)] border border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-100 mb-6 text-center tracking-wide">
          👤 Profile
        </h1>
        
        <div className="mb-6">
          <p className="text-lg text-gray-300">
            <span className="font-semibold">Username:</span> {user.username}
          </p>
          <p className="text-lg text-gray-300">
            <span className="font-semibold">User ID:</span> {user.id}
          </p>
        </div>

        <h2 className="text-xl font-semibold text-gray-100 mb-4">Your Polls</h2>
        
        {polls.length === 0 ? (
          <p className="text-gray-500 text-center">You haven’t created any polls yet.</p>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="border border-gray-700 p-4 rounded-md bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] shadow-md hover:shadow-[0_4px_15px_rgba(255,255,255,0.1)] transition-shadow duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-200 mb-2">{poll.title}</h3>
                <PollCard poll={poll} hasVoted={poll.isClosed} onVote={() => {}} />
                
                <button
                  onClick={() => router.push(`/polls/${poll.id}`)}
                  className="mt-3 border border-blue-500 text-blue-400 py-2 px-4 rounded-md hover:bg-blue-500 hover:text-white transition duration-200 w-full text-center"
                >
                  🔍 View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
