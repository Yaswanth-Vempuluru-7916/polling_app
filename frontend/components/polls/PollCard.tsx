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
    <div className="bg-gradient-to-br from-[#0d0d14] via-[#131328] to-[#0d0d14]  border border-gray-700 hover:border-cyan-400 rounded-xl p-5 shadow-lg hover:shadow-xl hover:shadow-cyan-900/20 transition-all duration-300">
      {/* Poll Status Badge */}
      {poll.isClosed && (
        <div className="absolute top-2 right-2 bg-red-500/80 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-md">
          Closed
        </div>
      )}
      
      {/* Poll Question */}
      <h2 className="text-lg font-bold text-gray-100 mb-6 drop-shadow-md">{poll.title}</h2>

      {/* Poll Options */}
      <div className="space-y-5">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          return (
            <div key={option.id} className="relative">
              <div className="flex justify-between items-center text-gray-300 mb-2">
                <span className="text-gray-200">{option.text}</span>
                <span className="text-gray-400 text-sm">{option.votes} votes ({percentage.toFixed(1)}%)</span>
              </div>
              
              {/* Vote Bar and Button Container */}
              <div className="flex items-center gap-2">
                {/* Vote Bar */}
                <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-cyan-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                {/* Vote Button */}
                {!hasVoted && !poll.isClosed && (
                  <div className="relative group">
                    <button
                      onClick={() => onVote(option.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105"
                      aria-label="Vote for this option"
                    >
                      <span>✓</span>
                    </button>
                    <div className="absolute opacity-0 group-hover:opacity-100 -top-8 right-0 bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg transition-opacity duration-200">
                      Vote
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Messages */}
      {poll.isClosed && <p className="text-gray-500 text-center mt-5 italic">This poll is closed.</p>}
      {hasVoted && !poll.isClosed && (
        <div className="mt-5 text-center">
          <p className="text-green-400 inline-block px-3 py-1 rounded-full bg-green-900/20 border border-green-500/20">You have voted!</p>
        </div>
      )}
    </div>
  );
};

export default PollCard;