import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    getCurrentUser();
    fetchThreads();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchThreads = async () => {
    try {
      const { data: threadsData, error: threadsError } = await supabase
        .from("threads")
        .select(
          `
          id,
          title,
          description,
          created_by,
          created_at,
          profiles:created_by (username, trust_score)
        `
        )
        .order("created_at", { ascending: false });

      if (threadsError) throw threadsError;

      const shuffledThreads = threadsData.sort(() => Math.random() - 0.5);

      const threadsWithCounts = await Promise.all(
        shuffledThreads.map(async (thread) => {
          const { count: repliesCount } = await supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", thread.id);

          const { data: postsData } = await supabase
            .from("posts")
            .select("id")
            .eq("thread_id", thread.id);

          let reactionsCount = 0;
          if (postsData && postsData.length > 0) {
            const postIds = postsData.map((p) => p.id);
            const { count } = await supabase
              .from("reactions")
              .select("id", { count: "exact", head: true })
              .in("post_id", postIds);
            reactionsCount = count || 0;
          }

          return {
            ...thread,
            repliesCount: repliesCount || 0,
            reactionsCount,
          };
        })
      );

      setThreads(threadsWithCounts);
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (threadId) => {
    window.location.href = `/thread/${threadId}`;
  };

  const handleReaction = async (threadId, reactionType) => {
    if (!currentUser) {
      alert("Please sign in to react");
      return;
    }

    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("id")
        .eq("thread_id", threadId)
        .limit(1);

      if (!postsData || postsData.length === 0) {
        console.error("No posts found for this thread");
        return;
      }

      const postId = postsData[0].id;
      const reactionKey = `${threadId}-${reactionType}`;

      if (userReactions[reactionKey]) {
        await supabase
          .from("reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUser.id)
          .eq("type", reactionType);

        setUserReactions((prev) => ({ ...prev, [reactionKey]: false }));
      } else {
        await supabase.from("reactions").insert({
          post_id: postId,
          user_id: currentUser.id,
          type: reactionType,
        });

        setUserReactions((prev) => ({ ...prev, [reactionKey]: true }));
      }

      fetchThreads();
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateDescription = (text, maxLength = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div
      className="flex min-h-screen bg-[#F3F3F3]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <main className="flex-1 lg:ml-64 pt-20 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Feed</h1>
            <p className="text-gray-600">
              Discover trending discussions and connect with the community
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-sm animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-500 text-lg">
                No threads yet. Be the first to create one!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100"
                >
                  <div onClick={() => handleThreadClick(thread.id)}>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                      {thread.title}
                    </h2>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {truncateDescription(thread.description)}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {thread.profiles?.username
                              ?.charAt(0)
                              .toUpperCase() || "U"}
                          </div>
                          <span className="font-medium text-gray-700">
                            {thread.profiles?.username || "Anonymous"}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{formatTimestamp(thread.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-4 text-gray-500">
                        <div className="flex items-center gap-1">
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
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span className="font-medium">
                            {thread.repliesCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
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
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {thread.reactionsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex gap-2 mt-4 pt-4 border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleReaction(thread.id, "like")}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        userReactions[`${thread.id}-like`]
                          ? "bg-[#A5D0FF] text-gray-900"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      Like
                    </button>

                    <button
                      onClick={() => handleReaction(thread.id, "love")}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        userReactions[`${thread.id}-love`]
                          ? "bg-[#A5D0FF] text-gray-900"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      Love
                    </button>

                    <button
                      onClick={() => handleReaction(thread.id, "insightful")}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        userReactions[`${thread.id}-insightful`]
                          ? "bg-[#A5D0FF] text-gray-900"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      Insightful
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
