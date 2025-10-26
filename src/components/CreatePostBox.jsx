import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const CreatePostBox = ({ user, userProfile, onPostCreated, threadId = null, parentId = null }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [toxicityWarning, setToxicityWarning] = useState(false);
  const [selectedThread, setSelectedThread] = useState(threadId);
  const [threads, setThreads] = useState([]);
  const [showThreadSelect, setShowThreadSelect] = useState(!threadId);

  useEffect(() => {
    if (!threadId) {
      fetchThreads();
    }
  }, [threadId]);

  const fetchThreads = async () => {
    const { data } = await supabase
      .from('threads')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(20);
    setThreads(data || []);
  };

  // Simple sentiment analysis (to be replaced with AI API)
  const analyzeSentiment = (text) => {
    const positiveWords = ['love', 'great', 'awesome', 'excellent', 'happy', 'good', 'wonderful', 'amazing'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'sad', 'angry', 'horrible', 'worst'];
    const toxicWords = ['stupid', 'idiot', 'dumb', 'kill', 'die'];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    const positiveCount = words.filter(word => positiveWords.some(pw => word.includes(pw))).length;
    const negativeCount = words.filter(word => negativeWords.some(nw => word.includes(nw))).length;
    const toxicCount = words.filter(word => toxicWords.some(tw => word.includes(tw))).length;

    if (toxicCount > 0) {
      setToxicityWarning(true);
      return 'negative';
    } else {
      setToxicityWarning(false);
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  useEffect(() => {
    if (content.length > 10) {
      const detectedSentiment = analyzeSentiment(content);
      setSentiment(detectedSentiment);
    } else {
      setSentiment(null);
      setToxicityWarning(false);
    }
  }, [content]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    if (!selectedThread && !threadId) {
      alert('Please select a thread');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalSentiment = analyzeSentiment(content);
      const toxicityScore = toxicityWarning ? 0.8 : 0.2;

      // Insert post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          thread_id: threadId || selectedThread,
          parent_id: parentId,
          content: content.trim(),
          sentiment: finalSentiment,
          toxicity_score: toxicityScore,
          is_flagged: toxicityWarning
        })
        .select()
        .single();

      if (postError) throw postError;

      // If toxic, auto-create a flag
      if (toxicityWarning) {
        await supabase.from('flags').insert({
          post_id: post.id,
          flagged_by: user.id,
          reason: 'Auto-flagged: High toxicity detected',
          ai_confidence: toxicityScore,
          status: 'pending'
        });
      }

      // Clear form
      setContent('');
      setSentiment(null);
      setToxicityWarning(false);
      
      if (onPostCreated) onPostCreated();

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSentimentEmoji = () => {
    if (!sentiment) return '💬';
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const getSentimentColor = () => {
    if (!sentiment) return 'text-gray-400';
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      <form onSubmit={handleSubmit}>
        {/* User Avatar & Info */}
        <div className="flex gap-4 mb-4">
          <div       className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A5D0FF] to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {userProfile?.username?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
          <div className="flex-1">
            {/* Thread Selector */}
            {showThreadSelect && (
              <select
                value={selectedThread || ''}
                onChange={(e) => setSelectedThread(e.target.value)}
                className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a thread...</option>
                {threads.map(thread => (
                  <option key={thread.id} value={thread.id}>
                    {thread.title}
                  </option>
                ))}
              </select>
            )}

            {/* Text Input */}
            <textarea
              className="create-post-textarea w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={parentId ? "Write a reply..." : "What's on your mind?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={2000}
            />

            {/* Character Count */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500">
                {content.length}/2000
              </span>
            </div>
          </div>
        </div>

        {/* AI Feedback & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {/* Sentiment Indicator */}
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {sentiment && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 ${getSentimentColor()}`}
                >
                  <span className="text-lg">{getSentimentEmoji()}</span>
                  <span className="text-sm font-medium capitalize">{sentiment}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toxicity Warning */}
            <AnimatePresence>
              {toxicityWarning && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-600"
                >
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-medium">Potentially toxic</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting || (!selectedThread && !threadId)}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              content.trim() && (selectedThread || threadId) && !isSubmitting
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Posting...</span>
              </div>
            ) : (
              parentId ? 'Reply' : 'Post'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreatePostBox;