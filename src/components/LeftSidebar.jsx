import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ onDashboard, onCreateThread }) {
  const [isOpen, setIsOpen] = useState(false);
  const [trendingThreads, setTrendingThreads] = useState([]);
  const [trendingUsers, setTrendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: threads, error: threadsError } = await supabase
        .from("threads")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (threadsError) throw threadsError;

      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, username, trust_score")
        .order("trust_score", { ascending: false })
        .limit(5);

      if (usersError) throw usersError;

      setTrendingThreads(threads || []);
      setTrendingUsers(users || []);
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();

  const handleDashboardClick = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        navigate(`/user/${user.id}/dashboard`);
      } else {
        alert("Please sign in first.");
      }
    } catch (error) {
      console.error("Error navigating to dashboard:", error);
    }
  };

  const handleThreadClick = (threadId) => {
    window.location.href = `/thread/${threadId}`;
  };

  const handleCreateThread = () => {
    window.location.href = "/create-thread";
  };

  const handleUserClick = (userId) => {
    window.location.href = `/profile/${userId}`;
  };

  const formatEngagement = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now - created) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const getAvatarEmoji = (index) => {
    const emojis = ["👩‍💻", "👨‍🎨", "👩‍🔬", "👨‍💼", "👩‍🚀"];
    return emojis[index % emojis.length];
  };

  const formatTrustScore = (score) => {
    if (!score) return "0";
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-lg bg-white text-gray-900 shadow-lg"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 top-16"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed mt-12 lg:sticky top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } bg-white border-r border-gray-200 w-64`}
      >
        <div className="p-4 space-y-4">
          <button
            onClick={handleDashboardClick}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
              />
            </svg>
            Dashboard
          </button>

          <button
            onClick={handleCreateThread}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-400 hover:bg-blue-500 text-gray-900 rounded-xl font-semibold transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Create Thread
          </button>

          <div className="rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                />
              </svg>
              <h3 className="font-bold text-gray-900">Trending Threads</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-gray-200 animate-pulse h-12"
                  ></div>
                ))}
              </div>
            ) : trendingThreads.length > 0 ? (
              <div className="space-y-2">
                {trendingThreads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => handleThreadClick(thread.id)}
                    className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-200"
                  >
                    <p className="font-medium text-sm truncate text-gray-900">
                      {thread.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatEngagement(thread.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                No threads yet
              </p>
            )}
          </div>

          <div className="rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <h3 className="font-bold text-gray-900">Trending Users</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trendingUsers.length > 0 ? (
              <div className="space-y-2">
                {trendingUsers.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-200"
                  >
                    <div className="text-2xl">{getAvatarEmoji(index)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900">
                        {user.username || `User ${user.id.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTrustScore(user.trust_score)} trust score
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                No users yet
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
