import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      await getCurrentUser();
      await fetchThreads();
    };
    init();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
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

      const threadsWithData = await Promise.all(
        threadsData.map(async (thread) => {
          const { count: repliesCount } = await supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", thread.id);

          const reactions = await fetchReactions(thread.id);

          return {
            ...thread,
            repliesCount: repliesCount || 0,
            reactions: reactions.counts,
            userReactions: reactions.userReactions,
          };
        })
      );

      setThreads(threadsWithData);
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReactions = async (threadId) => {
    try {
      const { data: posts } = await supabase
        .from("posts")
        .select("id")
        .eq("thread_id", threadId);

      if (!posts || posts.length === 0) {
        return {
          counts: { like: 0, love: 0, insightful: 0 },
          userReactions: { like: false, love: false, insightful: false },
        };
      }

      const postIds = posts.map((p) => p.id);

      const { data: reactionsData, error } = await supabase
        .from("reactions")
        .select("id, type, user_id, post_id")
        .in("post_id", postIds);

      if (error) throw error;

      const counts = { like: 0, love: 0, insightful: 0 };
      const userReactions = { like: false, love: false, insightful: false };

      if (reactionsData) {
        reactionsData.forEach((reaction) => {
          if (counts.hasOwnProperty(reaction.type)) {
            counts[reaction.type]++;
          }
          if (reaction.user_id === userId) {
            userReactions[reaction.type] = true;
          }
        });
      }

      return { counts, userReactions };
    } catch (error) {
      console.error("Error fetching reactions:", error);
      return {
        counts: { like: 0, love: 0, insightful: 0 },
        userReactions: { like: false, love: false, insightful: false },
      };
    }
  };

  const toggleReaction = async (threadId, type) => {
    if (!userId) {
      alert("Please sign in to react");
      return;
    }

    try {
      // ✅ Step 1: Get any one post from this thread (since reactions link to posts)
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id")
        .eq("thread_id", threadId)
        .limit(1);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        console.warn("No posts found for this thread. Cannot react.");
        return;
      }

      const postId = posts[0].id;

      // ✅ Step 2: Check if user already reacted
      const { data: existingReaction, error: fetchError } = await supabase
        .from("reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .eq("type", type)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // ✅ Step 3: Toggle reaction
      if (existingReaction) {
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from("reactions").insert({
          post_id: postId, // valid post id
          user_id: userId,
          type: type,
        });

        if (insertError) throw insertError;
      }

      // ✅ Step 4: Refresh threads to reflect new counts
      await fetchThreads();
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleThreadClick = (threadId) => {
    window.location.href = `/thread/${threadId}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    return `${month} ${day}, ${year} at ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const truncateDescription = (text, maxLength = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div
      className="flex w-full bg-[#F3F3F3]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <main className="w-[63vw] flex-1 lg:ml-64 pt-20 pb-8 px-4">
        <div className="max-w-2xl">
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
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
                >
                  <div
                    onClick={() => handleThreadClick(thread.id)}
                    className="cursor-pointer"
                  >
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
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex gap-2 mt-4 pt-4 border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleReaction(thread.id, "like")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                        thread.userReactions?.like
                          ? "bg-[#A5D0FF] text-gray-900 border-[#A5D0FF]"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base">👍</span>
                      <span>{thread.reactions?.like || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleReaction(thread.id, "love")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                        thread.userReactions?.love
                          ? "bg-[#A5D0FF] text-gray-900 border-[#A5D0FF]"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base">❤️</span>
                      <span>{thread.reactions?.love || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleReaction(thread.id, "insightful")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                        thread.userReactions?.insightful
                          ? "bg-[#A5D0FF] text-gray-900 border-[#A5D0FF]"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-base">💡</span>
                      <span>{thread.reactions?.insightful || 0}</span>
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
