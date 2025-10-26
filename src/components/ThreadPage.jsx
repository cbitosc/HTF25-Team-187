import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Heart, Sparkles, Lightbulb, Send, MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom";
import { summarizeText } from "../utils/gemini";
import { Brain } from "lucide-react"; // optional icon

export default function ThreadPage() {
  const { id: threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({
    like: 0,
    love: 0,
    insightful: 0,
  });
  const [userReactions, setUserReactions] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [aiSummary, setAiSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  async function handleSummarize() {
    try {
      setSummarizing(true);
      setAiSummary(null);

      // Combine thread + comments text for context
      const fullText = `
      Title: ${thread.title}
      Description: ${thread.description || ""}
      Comments:
      ${comments.map((c) => `- ${c.content}`).join("\n")}
    `;

      const summary = await summarizeText(fullText);

      if (summary) {
        setAiSummary(summary);
      } else {
        setAiSummary("⚠️ AI summarization failed. Try again later.");
      }
    } catch (error) {
      console.error("AI summarization error:", error);
      setAiSummary("⚠️ Failed to generate summary.");
    } finally {
      setSummarizing(false);
    }
  }

  useEffect(() => {
    if (!threadId) return;
    loadThreadData();
    getCurrentUser();
  }, [threadId]);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  async function loadThreadData() {
    try {
      setLoading(true);
      setError(null);

      // Load thread + creator
      const { data: threadData, error: threadError } = await supabase
        .from("threads")
        .select(
          `
        id,
        title,
        description,
        created_at,
        created_by,
        profiles:created_by (username)
      `
        )
        .eq("id", threadId)
        .single();

      if (threadError) throw threadError;
      setThread(threadData);

      // Load comments with author profiles
      const { data: commentsData, error: commentsError } = await supabase
        .from("posts")
        .select(
          `
        id,
        content,
        created_at,
        author_id,
        thread_id,
        profiles:author_id (username, trust_score)
      `
        )
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);

      // Load reactions
      await loadReactions(commentsData || []);
    } catch (err) {
      setError(err.message);
      console.error("Error loading thread:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadReactions(posts) {
    if (!posts.length) {
      setReactions({ like: 0, love: 0, insightful: 0 });
      return;
    }

    const postIds = posts.map((p) => p.id);

    // Get all reactions for posts in this thread
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("reactions")
      .select("*")
      .in("post_id", postIds);

    if (reactionsError) {
      console.error("Error loading reactions:", reactionsError);
      return;
    }

    // Aggregate reaction counts
    const counts = { like: 0, love: 0, insightful: 0 };
    const userReactionSet = new Set();

    reactionsData?.forEach((reaction) => {
      if (reaction.type in counts) {
        counts[reaction.type]++;
      }
      if (currentUser && reaction.user_id === currentUser.id) {
        userReactionSet.add(reaction.type);
      }
    });

    setReactions(counts);
    setUserReactions(userReactionSet);
  }

  async function handleReaction(type) {
    if (!currentUser) {
      alert("Please sign in to react");
      return;
    }

    try {
      // Create a dummy post for thread-level reactions if needed
      // Or use the first post in the thread
      if (comments.length === 0) {
        alert("Add a comment first to enable reactions");
        return;
      }

      const firstPost = comments[0];

      if (userReactions.has(type)) {
        // Remove reaction
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("post_id", firstPost.id)
          .eq("user_id", currentUser.id)
          .eq("type", type);

        if (error) throw error;

        setReactions((prev) => ({
          ...prev,
          [type]: Math.max(0, prev[type] - 1),
        }));
        setUserReactions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(type);
          return newSet;
        });
      } else {
        // Add reaction
        const { error } = await supabase.from("reactions").insert({
          post_id: firstPost.id,
          user_id: currentUser.id,
          type,
        });

        if (error) throw error;

        setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
        setUserReactions((prev) => new Set([...prev, type]));
      }
    } catch (err) {
      console.error("Error handling reaction:", err);
      alert("Failed to update reaction");
    }
  }

  async function handleSubmitComment() {
    if (!currentUser) {
      alert("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from("posts")
        .insert({
          thread_id: threadId,
          author_id: currentUser.id,
          content: newComment.trim(),
          sentiment: "neutral",
          toxicity_score: 0,
          is_flagged: false,
        })
        .select(
          `
          *,
          author:profiles!posts_author_id_fkey(username, trust_score)
        `
        )
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data]);
      setNewComment("");
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Failed to load thread</p>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[70vw]  bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Thread Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {thread.title}
          </h1>
          {thread.description && (
            <p className="text-gray-700 mb-4">{thread.description}</p>
          )}
          <div className="flex items-center text-sm text-gray-500">
            <span>
              Posted by{" "}
              <span className="font-medium">
                {thread.creator?.username || "Unknown"}
              </span>
            </span>
            <span className="mx-2">•</span>
            <span>{formatDate(thread.created_at)}</span>
          </div>

          {/* Reactions */}
          <div className="flex gap-4 mt-6 pt-6 border-t">
            <button
              onClick={() => handleReaction("like")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                userReactions.has("like")
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              disabled={!currentUser}
            >
              <Heart
                className={`w-5 h-5 ${
                  userReactions.has("like") ? "fill-current" : ""
                }`}
              />
              <span className="font-medium">{reactions.like}</span>
            </button>
            <button
              onClick={() => handleReaction("love")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                userReactions.has("love")
                  ? "bg-pink-100 text-pink-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              disabled={!currentUser}
            >
              <Sparkles
                className={`w-5 h-5 ${
                  userReactions.has("love") ? "fill-current" : ""
                }`}
              />
              <span className="font-medium">{reactions.love}</span>
            </button>
            <button
              onClick={() => handleReaction("insightful")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                userReactions.has("insightful")
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              disabled={!currentUser}
            >
              <Lightbulb
                className={`w-5 h-5 ${
                  userReactions.has("insightful") ? "fill-current" : ""
                }`}
              />
              <span className="font-medium">{reactions.insightful}</span>
            </button>
          </div>
          {/* AI Summarization */}
          <div className="mt-6">
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60"
            >
              <Brain className="w-5 h-5" />
              {summarizing ? "Generating Summary..." : "AI Summarization"}
            </button>

            {aiSummary && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 whitespace-pre-line">
                <h3 className="font-semibold mb-2 text-gray-700">
                  AI Summary:
                </h3>
                <p>{aiSummary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments ({comments.length})
          </h2>

          {/* Add Comment */}
          {currentUser ? (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
              />
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center text-gray-600">
              Please sign in to comment
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {comment.author?.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {comment.author?.username || "Unknown User"}
                        </span>
                        {comment.author?.trust_score > 75 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Trusted
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
