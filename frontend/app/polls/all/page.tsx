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

  if (isHydrating || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14]">
      <div className="p-4 rounded-lg bg-gray-800/50 shadow-xl backdrop-blur-sm">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-cyan-400 rounded-full"></div>
          <div className="h-3 w-3 bg-cyan-400 rounded-full"></div>
          <div className="h-3 w-3 bg-cyan-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14]">
      <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30 shadow-xl backdrop-blur-sm text-red-300">
        <span className="text-red-500 text-xl mr-2">⚠️</span>
        {error}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] overflow-hidden">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 mt-12">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent text-center drop-shadow-lg">
          All Polls
        </h1>

        {polls.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 rounded-xl bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 shadow-lg">
            <div className="text-gray-400 text-center text-lg">No polls available yet.</div>
            <div className="mt-4 text-gray-500 text-sm">Check back later or create your own poll</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                hasVoted={votedPolls.includes(poll.id) || poll.isClosed}
                onVote={(optionId) => handleVote(poll.id, optionId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllPollsPage;