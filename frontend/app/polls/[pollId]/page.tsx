// app/polls/[pollId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PollCard from '@/components/polls/PollCard';
import { getPoll, voteOnPoll } from '@/lib/api';
import { Poll, useAppStore } from '@/lib/store';

const PollPage = () => {
  const { pollId } = useParams();
  const { polls, updatePoll } = useAppStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;
  if (!poll) return <div className="text-center p-4">Poll not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{poll.title}</h1>
      <PollCard poll={poll} hasVoted={hasVoted} onVote={handleVote} />
    </div>
  );
};

export default PollPage;