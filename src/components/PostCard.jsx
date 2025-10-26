import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import CreatePostBox from './CreatePostBox';

const PostCard = ({ post, currentUser, level = 0 }) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [reactions, setReactions] = useState({ like: 0, love: 0, insightful: 0 });
  const [userReaction, setUserReaction] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);

  useEffect(() => {
    fetchReplies();
    fetchReactions();
  }, [post.id]);

  const fetchReplies = async () => {
    const { data, count } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          trust_score
        )
      `, { count: 'exact' })
      .eq('parent_id', post.id)
      .order('created_at', { ascending: true });

    setReplies(data || []);
    setReplyCount(count || 0);
  };

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type, user_id')
      .eq('post_id', post.id);

    if (data) {
      const counts = { like: 0, love: 0, insightful: 0 };
      data.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (currentUser && r.user_id === currentUser.id) {
          setUserReaction(r.reaction_type);
        }
      });
      setReactions(counts);
    }
  };

  const handleReaction = async (reactionType) => {
    if (!currentUser) return;

    try {
      // Remove existing reaction
      if (userReaction) {
        await supabase
          .from('reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id);
      }

      // Add new reaction if different
      if (userReaction !== reactionType) {
        await supabase.from('reactions').insert({
          post_id: post.id,
          user_id: currentUser.id,
          reaction_type: reactionType
        });
        setUserReaction(reactionType);
      } else {
        setUserReaction(null);
      }

      fetchReactions();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleFlag = async (reason) => {
    if (!currentUser) return;

    try {
      await supabase.from('flags').insert({
        post_id: post.id,
        flagged_by: currentUser.id,
        reason: reason,
        status: 'pending'
      });

      await supabase
        .from('posts')
        .update({ is_flagged: true })
        .eq('id', post.id);

      setShowFlagModal(false);
      alert('Post has been flagged for review');
    } catch (error) {
      console.error('Error flagging post:', error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return posted.toLocaleDateString();
  };

  const getSentimentStyle = () => {
    switch (post.sentiment) {
      case 'positive':
        return 'border-l-4 border-green-400 bg-green-50';
      case 'negative':
        return 'border-l-4 border-red-400 bg-red-50';
      default:
        return 'border-l-4 border-gray-300';
    }
  };

  const reactionButtons = [
    { type: 'like', emoji: '❤️', label: 'Like' },
    { type: 'love', emoji: '💖', label: 'Love' },
    { type: 'insightful', emoji: '💡', label: 'Insightful' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 ${
        level > 0 ? 'ml-12 mt-4' : 'mb-4'
      } ${post.is_flagged ? 'border-red-300' : ''}`}
    >
      <div className={`p-6 ${getSentimentStyle()}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A5D0FF] to-blue-500 flex items-center justify-center text-white font-bold text-lg">
              {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {post.profiles?.username || 'Anonymous'}
                </h3>
                {post.profiles?.trust_score >= 80 && (
                  <span className="text-blue-500" title="Trusted Member">✓</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
            </div>
          </div>

          {/* More Options */}
          {currentUser && currentUser.id !== post.user_id && (
            <button
              onClick={() => setShowFlagModal(true)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Report"
            >
              🚩
            </button>
          )}
        </div>

        {/* Thread Context */}
        {post.threads && level === 0 && (
          <div className="mb-3 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
            📌 {post.threads.title}
          </div>
        )}

        {/* Flagged Warning */}
        {post.is_flagged && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 text-red-800">
            <span>⚠️</span>
            <span className="text-sm font-medium">This post has been flagged for review</span>
          </div>
        )}

        {/* Content */}
        <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Sentiment Badge */}
        {post.sentiment && (
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              post.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
              post.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {post.sentiment === 'positive' ? '😊' : post.sentiment === 'negative' ? '😟' : '😐'}
              <span className="capitalize">{post.sentiment}</span>
            </span>
          </div>
        )}

        {/* Reactions Bar */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          {reactionButtons.map(({ type, emoji, label }) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleReaction(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                userReaction === type
                  ? 'bg-blue-100 text-[#A5D0FF]'
                  : 'hover:bg-[#F3F3F3] text-gray-600'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-medium">
                {reactions[type] > 0 ? reactions[type] : ''}
              </span>
            </motion.button>
          ))}

          {/* Reply Button */}
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F3F3F3] text-gray-600 transition-all ml-auto"
          >
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium">
              {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Reply'}
            </span>
          </button>

          {/* View Replies */}
          {replyCount > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sm text-[#A5D0FF] hover:text-blue-600 font-medium"
            >
              {showReplies ? '↑ Hide' : '↓ Show'}
            </button>
          )}
        </div>
      </div>

      {/* Reply Box */}
      <AnimatePresence>
        {showReplyBox && currentUser && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            <CreatePostBox
              user={currentUser}
              userProfile={{ username: currentUser.email.split('@')[0] }}
              threadId={post.thread_id}
              parentId={post.id}
              onPostCreated={() => {
                setShowReplyBox(false);
                fetchReplies();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies */}
      <AnimatePresence>
        {showReplies && replies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {replies.map(reply => (
              <PostCard
                key={reply.id}
                post={reply}
                currentUser={currentUser}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag Modal */}
      <AnimatePresence>
        {showFlagModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFlagModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Report Post</h3>
              <p className="text-gray-600 mb-4">Why are you reporting this post?</p>
              <div className="space-y-2">
                {['Spam', 'Harassment', 'Misinformation', 'Inappropriate Content', 'Other'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => handleFlag(reason)}
                    className="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFlagModal(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;