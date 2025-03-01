// app/polls/[pollId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { getPoll, voteOnPoll } from '@/lib/api';
import PollCard from '@/components/polls/PollCard';

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

const PollPage = () => {
  const { pollId } = useParams(); // Get dynamic pollId from URL
  const [poll, setPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch poll data on mount
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollData = await getPoll(pollId as string);
        setPoll(pollData);
        // Check if user has voted (stored in sessionStorage for simplicity)
        const votedPolls = JSON.parse(sessionStorage.getItem('votedPolls') || '[]');
        setHasVoted(votedPolls.includes(pollId));
      } catch (err) {
        setError('Failed to load poll.');
        console.error('Error fetching poll:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [pollId]);

  // Handle voting
  const handleVote = async (optionId: number) => {
    if (hasVoted || !poll || poll.isClosed) return;

    try {
      await voteOnPoll(pollId as string, optionId);
      // Update local state
      setPoll({
        ...poll,
        options: poll.options.map((opt) =>
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        ),
      });
      setHasVoted(true);
      // Store vote in sessionStorage
      const votedPolls = JSON.parse(sessionStorage.getItem('votedPolls') || '[]');
      sessionStorage.setItem('votedPolls', JSON.stringify([...votedPolls, pollId]));
    } catch (err) {
      setError('Failed to submit vote.');
      console.error('Error voting:', err);
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