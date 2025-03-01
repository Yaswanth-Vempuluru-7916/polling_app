// components/polls/PollForm.tsx
'use client';

import { useCallback } from 'react';

interface PollOption {
  id: number;
  text: string;
}

interface PollFormProps {
  title: string;
  setTitle: (title: string) => void;
  options: PollOption[];
  setOptions: (options: PollOption[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

const PollForm = ({ title, setTitle, options, setOptions, onSubmit, loading }: PollFormProps) => {
  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Handle option change
  const handleOptionChange = (id: number, text: string) => {
    setOptions(
      options.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    );
  };

  // Add a new option
  const addOption = useCallback(() => {
    const newId = options.length ? options[options.length - 1].id + 1 : 1;
    setOptions([...options, { id: newId, text: '' }]);
  }, [options, setOptions]);

  // Remove an option (only if more than 2 options exist)
  const removeOption = (id: number) => {
    if (options.length > 2) {
      setOptions(options.filter((opt) => opt.id !== id));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Poll Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Poll Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter your poll question"
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          disabled={loading}
        />
      </div>

      {/* Poll Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options (at least 2 required)
        </label>
        {options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={option.text}
              onChange={(e) => handleOptionChange(option.id, e.target.value)}
              placeholder={`Option ${option.id}`}
              className="block w-full border border-gray-300 rounded-md p-2"
              disabled={loading}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="text-red-500 hover:text-red-700"
                disabled={loading}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="text-blue-500 hover:text-blue-700 mt-2"
          disabled={loading}
        >
          + Add Option
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Poll'}
      </button>
    </form>
  );
};

export default PollForm;