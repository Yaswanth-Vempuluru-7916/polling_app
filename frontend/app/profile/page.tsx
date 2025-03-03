// app/profile/page.tsx
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

  // Fetch polls only once on mount or when user changes
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
  }, [user, isHydrating]); // Removed polls from deps to prevent loop

  // Separate WebSocket effect with stable dependencies
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
      ws.onerror = (err: Event) => console.error('WebSocket error:', err); // Typed as Event
      return () => {
        ws.close();
      };
    }
  }, [isHydrating, user, polls.length]); // Stable deps: polls.length instead of polls

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (!user) return null;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile</h1>
        <div className="mb-6">
          <p className="text-lg text-gray-700">
            <span className="font-semibold">Username:</span> {user.username}
          </p>
          <p className="text-lg text-gray-700">
            <span className="font-semibold">User ID:</span> {user.id}
          </p>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Polls</h2>
        {polls.length === 0 ? (
          <p className="text-gray-500">You haven’t created any polls yet.</p>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => (
              <div key={poll.id} className="border p-4 rounded-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{poll.title}</h3>
                <PollCard poll={poll} hasVoted={poll.isClosed} onVote={() => {}} />
                <button
                  onClick={() => router.push(`/polls/${poll.id}`)}
                  className="mt-2 text-blue-500 hover:text-blue-700"
                >
                  View Details
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