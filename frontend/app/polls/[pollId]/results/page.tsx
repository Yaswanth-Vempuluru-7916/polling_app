// app/polls/[pollId]/results/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getPoll } from '@/lib/api';
import { useAppStore, Poll } from '@/lib/store';
import Navbar from '@/components/Navbar';

const PollResultsPage = () => {
  const { pollId } = useParams();
  const { updatePoll } = useAppStore();
  const [poll, setPoll] = useState<Poll | null>(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load poll results.');
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();

    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      ws.send(`join_poll:${pollId}`);
    };
    ws.onmessage = (event) => {
      const updatedPoll: Poll = JSON.parse(event.data);
      setPoll(updatedPoll);
      updatePoll(updatedPoll);
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
    return () => ws.close();
  }, [pollId, updatePoll]);

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;
  if (!poll) return <div className="text-center p-4">Poll not found.</div>;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{poll.title} - Live Results</h1>
        <div className="space-y-4">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            return (
              <div key={option.id} className="border p-3 rounded-md">
                <div className="flex justify-between mb-2">
                  <span>{option.text}</span>
                  <span>{option.votes} votes ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-gray-600">Total Votes: {totalVotes}</p>
        {poll.isClosed && <p className="text-gray-500 mt-2">This poll is closed.</p>}
      </div>
    </div>
  );
};

export default PollResultsPage;