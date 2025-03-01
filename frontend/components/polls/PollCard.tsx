// components/polls/PollCard.tsx
'use client';

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

interface PollCardProps {
  poll: Poll;
  hasVoted: boolean;
  onVote: (optionId: number) => void;
}

const PollCard = ({ poll, hasVoted, onVote }: PollCardProps) => {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="border rounded-md p-4">
      {poll.options.map((option) => {
        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        return (
          <div key={option.id} className="mb-4">
            <div className="flex justify-between items-center">
              <span>{option.text}</span>
              <span>{option.votes} votes ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
              <div
                className="bg-blue-500 h-2.5 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {!hasVoted && !poll.isClosed && (
              <button
                onClick={() => onVote(option.id)}
                className="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
              >
                Vote
              </button>
            )}
          </div>
        );
      })}
      {poll.isClosed && <p className="text-gray-500 mt-2">This poll is closed.</p>}
      {hasVoted && <p className="text-green-500 mt-2">You have voted!</p>}
    </div>
  );
};

export default PollCard;