// app/polls/all/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchAllPolls, voteOnPoll } from '@/lib/api';
import { useAppStore, Poll } from '@/lib/store';
import PollCard from '@/components/polls/PollCard';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

const AllPollsPage = () => {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
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
    if (!isHydrating) {
      const loadPolls = async () => {
        try {
          const allPolls = await fetchAllPolls();
          setPolls(allPolls);
          const storedVotedPolls = JSON.parse(sessionStorage.getItem('votedPolls') || '[]');
          setVotedPolls(storedVotedPolls);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load polls.');
        } finally {
          setLoading(false);
        }
      };
      loadPolls();
    }
  }, [isHydrating]);

  useEffect(() => {
    if (!isHydrating) {
      const ws = new WebSocket('ws://localhost:8080/ws');
      ws.onopen = () => {
        console.log('Connected to WebSocket for all polls');
        polls.forEach((poll) => ws.send(`join_poll:${poll.id}`));
      };
      ws.onmessage = (event) => {
        const updatedPoll: Poll = JSON.parse(event.data);
        setPolls((prevPolls) =>
          prevPolls.map((p) => (p.id === updatedPoll.id ? updatedPoll : p))
        );
      };
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        console.log('WebSocket state:', ws.readyState);
      };
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
      };
      return () => ws.close();
    }
  }, [isHydrating, polls.length]);
  

  const handleVote = async (pollId: string, optionId: number) => {
    if (votedPolls.includes(pollId)) return;

    try {
      await voteOnPoll(pollId, optionId);
      const updatedPolls = polls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((opt) =>
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
              ),
            }
          : poll
      );
      setPolls(updatedPolls);
      const newVotedPolls = [...votedPolls, pollId];
      setVotedPolls(newVotedPolls);
      sessionStorage.setItem('votedPolls', JSON.stringify(newVotedPolls));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote.');
    }
  };

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">All Polls</h1>
        {polls.length === 0 ? (
          <p className="text-gray-500">No polls available yet.</p>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => (
              <div key={poll.id} className="border p-4 rounded-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{poll.title}</h2>
                <PollCard
                  poll={poll}
                  hasVoted={votedPolls.includes(poll.id) || poll.isClosed}
                  onVote={(optionId) => handleVote(poll.id, optionId)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllPollsPage;