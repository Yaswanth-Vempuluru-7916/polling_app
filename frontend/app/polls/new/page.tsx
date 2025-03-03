// app/polls/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import PollForm from '@/components/polls/PollForm';
import { createPoll } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import Navbar from '@/components/Navbar';

const NewPollPage = () => {
  const router = useRouter();
  const { user } = useAppStore();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<{ id: number; text: string }[]>([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!title.trim()) {
      setError('Poll title is required.');
      setLoading(false);
      return;
    }
    const validOptions = options.filter((opt) => opt.text.trim());
    if (validOptions.length < 2) {
      setError('At least two options are required.');
      setLoading(false);
      return;
    }

    try {
      const pollData = {
        title,
        options: validOptions.map((opt) => opt.text),
      };
      const newPoll = await createPoll(pollData);
      console.log('Poll created successfully:', newPoll);
      setTitle('');
      setOptions([{ id: 1, text: '' }, { id: 2, text: '' }]);
      router.push(`/polls/${newPoll.id}`);
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Create a New Poll</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <PollForm
          title={title}
          setTitle={setTitle}
          options={options}
          setOptions={setOptions}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default NewPollPage;