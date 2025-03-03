// app/polls/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchUserPolls, closePoll, resetPoll, deletePoll, editPoll, logout } from '@/lib/api';
import { Poll, useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';

const PollManagePage = () => {
  const router = useRouter();
  const { user, polls, setPolls, setUser } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editOptions, setEditOptions] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(() => {
      setIsHydrating(false);
    });
    setTimeout(() => setIsHydrating(false), 100);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isHydrating && !user) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('http://localhost:8080/api/user', { withCredentials: true });
          setUser({ username: response.data.username, id: response.data.id });
        } catch (err) {
          router.push('/login');
        }
      };
      fetchUser();
    }
  }, [user, router, setUser, isHydrating]);

  useEffect(() => {
    if (!isHydrating && !user) return;
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
  }, [user, router, setPolls, isHydrating]);

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close poll.');
    }
  };

  const handleResetPoll = async (pollId: string) => {
    try {
      await resetPoll(pollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset poll.');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (confirm('Are you sure you want to delete this poll?')) {
      try {
        await deletePoll(pollId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete poll.');
      }
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setEditTitle(poll.title);
    setEditOptions(poll.options.map((opt) => ({ id: opt.id, text: opt.text })));
  };

  const handleSaveEdit = async () => {
    if (!editingPoll) return;
    try {
      const editedPoll = await editPoll(editingPoll.id, {
        title: editTitle,
        options: editOptions.map((opt) => opt.text),
      });
      setEditingPoll(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit poll.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout.');
    }
  };

  const handleOptionChange = (id: number, text: string) => {
    setEditOptions(editOptions.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const addOption = () => {
    const newId = editOptions.length ? editOptions[editOptions.length - 1].id + 1 : 1;
    setEditOptions([...editOptions, { id: newId, text: '' }]);
  };

  const removeOption = (id: number) => {
    if (editOptions.length > 2) {
      setEditOptions(editOptions.filter((opt) => opt.id !== id));
    }
  };

  if (isHydrating) return <div className="text-center p-4">Loading...</div>;
  if (!user) return null;
  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Manage Your Polls</h1>
        {polls.length === 0 ? (
          <p className="text-gray-500">You haven’t created any polls yet.</p>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <div key={poll.id} className="border p-3 rounded-md">
                <h2 className="text-lg font-semibold text-gray-800">{poll.title}</h2>
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
                  <button
                    onClick={() => handleDeletePoll(poll.id)}
                    className="bg-red-700 text-white py-1 px-3 rounded hover:bg-red-800"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleEditPoll(poll)}
                    className="bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPoll && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Poll</h2>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Poll Title"
              className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {editOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  placeholder={`Option ${option.id}`}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editOptions.length > 2 && (
                  <button
                    onClick={() => removeOption(option.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="text-blue-500 hover:text-blue-700 mb-4"
            >
              + Add Option
            </button>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingPoll(null)}
                className="bg-gray-300 text-gray-800 py-1 px-3 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollManagePage;