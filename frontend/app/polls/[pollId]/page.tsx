'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PollCard from '@/components/polls/PollCard';
import { getPoll, voteOnPoll } from '@/lib/api';
import { Poll, useAppStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

const PollPage = () => {
  const { pollId } = useParams();
  const { polls, updatePoll } = useAppStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(() => {
      setIsHydrating(false);
    });
    setTimeout(() => setIsHydrating(false), 100);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isHydrating && !useAppStore.getState().user) {
      router.push('/login');
    }
  }, [router, isHydrating]);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollData = await getPoll(pollId as string);
        setPoll(pollData);
        const votedPolls = JSON.parse(sessionStorage.getItem('votedPolls') || '[]');
        setHasVoted(votedPolls.includes(pollId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load poll.');
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [pollId]);

  const handleVote = async (optionId: number) => {
    if (hasVoted || !poll || poll.isClosed) return;

    try {
      await voteOnPoll(pollId as string, optionId);
      const updatedPoll = {
        ...poll,
        options: poll.options.map((opt) =>
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        ),
      };
      setPoll(updatedPoll);
      updatePoll(updatedPoll);
      setHasVoted(true);
      const votedPolls = JSON.parse(sessionStorage.getItem('votedPolls') || '[]');
      sessionStorage.setItem('votedPolls', JSON.stringify([...votedPolls, pollId]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote.');
    }
  };

  if (isHydrating || loading) return <div className="text-center p-4 text-gray-300">Loading...</div>;
  if (error) return <div className="text-center p-4 text-red-400">{error}</div>;
  if (!poll) return <div className="text-center p-4 text-gray-300">Poll not found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14] overflow-hidden relative">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-8 bg-[#1e1e2e] shadow-lg rounded-lg text-gray-100 border border-gray-800">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
          {poll.title}
        </h1>
        <PollCard poll={poll} hasVoted={hasVoted} onVote={handleVote} />
      </div>
    </div>
  );
};

export default PollPage;