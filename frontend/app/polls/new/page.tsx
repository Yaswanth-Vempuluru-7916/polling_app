// app/polls/new/page.tsx
'use client';

import { useState } from 'react';

import axios from 'axios';
import PollForm from '@/components/polls/PollForm';
import { createPoll } from '@/lib/api';

// Define the shape of a poll option
interface PollOption {
  id: number;
  text: string;
}

const NewPollPage = () => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: 1, text: '' },
    { id: 2, text: '' }, // Start with at least 2 options
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle form submission
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
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create a New Poll</h1>
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
  );
};

export default NewPollPage;