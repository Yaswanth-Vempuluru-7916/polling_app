// app/polls/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchUserPolls, closePoll, resetPoll } from '@/lib/api';

interface PollOption {
  id: number;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  isClosed: boolean;
}

const PollManagePage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPolls = async () => {
      try {
        const userPolls = await fetchUserPolls();
        setPolls(userPolls);
      } catch (err) {
        setError('Failed to load your polls.');
        console.error('Error fetching polls:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPolls();
  }, []);

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll(pollId);
      setPolls(polls.map(poll => 
        poll.id === pollId ? { ...poll, isClosed: true } : poll
      ));
    } catch (err) {
      setError('Failed to close poll.');
      console.error('Error closing poll:', err);
    }
  };

  const handleResetPoll = async (pollId: string) => {
    try {
      await resetPoll(pollId);
      setPolls(polls.map(poll => 
        poll.id === pollId ? { ...poll, options: poll.options.map(opt => ({ ...opt, votes: 0 })) } : poll
      ));
    } catch (err) {
      setError('Failed to reset poll.');
      console.error('Error resetting poll:', err);
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Your Polls</h1>
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