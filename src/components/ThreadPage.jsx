import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Send, Lightbulb, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ThreadDetail({ threadId }) {
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    fetchThreadAndPosts();
  }, [threadId]);

  const fetchThreadAndPosts = async () => {
    setLoading(true);

    // Fetch thread details
    const { data: threadData, error: threadError } = await supabase
      .from('threads')
      .select(`
        *,
        profiles:created_by (
          username
        )
      `)
      .eq('id', threadId)
      .single();

    console.log('Thread Data:', threadData);
    console.log('Thread Error:', threadError);

    if (threadError) {
      console.error('Error fetching thread:', threadError);
    } else {
      setThread(threadData);
    }

    // Fetch posts (comments) for this thread
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (
          username
        )
      `)
      .eq('thread_id', threadId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    console.log('Posts Data:', postsData);
    console.log('Posts Error:', postsError);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    } else {
      // Fetch reactions for each post
      const postsWithReactions = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: reactionsData } = await supabase
            .from('reactions')
            .select('type')
            .eq('post_id', post.id);

          const reactions = {
            love: reactionsData?.filter(r => r.type === 'love').length || 0,
            insightful: reactionsData?.filter(r => r.type === 'insightful').length || 0,
            like: reactionsData?.filter(r => r.type === 'like').length || 0
          };

          return { ...post, reactions };
        })
      );

      setPosts(postsWithReactions);
    }

    setLoading(false);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !session) {
      alert('Please sign in to comment');
      return;
    }

    const { error } = await supabase
      .from('posts')
      .insert([
        {
          thread_id: threadId,
          content: newComment,
          author_id: session.user.id,
          parent_id: null
        }
      ]);

    if (error) {
      console.error('Error posting comment:', error);
    } else {
      setNewComment('');
      fetchThreadAndPosts();
    }
  };

  const handleReaction = async (postId, reactionType) => {
    if (!session) {
      alert('Please sign in to react');
      return;
    }

    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', session.user.id)
      .eq('type', reactionType)
      .single();

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
      await supabase
        .from('reactions')
        .insert([
          {
            post_id: postId,
            user_id: session.user.id,
            type: reactionType
          }
        ]);
    }

    fetchThreadAndPosts();
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
        <div className="text-gray-600">Thread not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Thread Card */}
        <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Thread Header */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold">
                {thread.profiles?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {thread.profiles?.username || 'Anonymous'}
                </p>
                <p className="text-sm text-gray-500">
                  {getTimeAgo(thread.created_at)}
                </p>
              </div>
            </div>

            {/* Thread Title and Content */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {thread.title}
            </h1>
            <div className="text-gray-700 whitespace-pre-line mb-6">
              {thread.description}
            </div>

            {/* Summary if available */}
            {thread.summary && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
                <p className="font-semibold text-blue-900 mb-1">AI Summary</p>
                <p className="text-blue-800">{thread.summary}</p>
              </div>
            )}

            {/* Reactions Bar */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
                <span className="font-medium">Love</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-yellow-50 text-gray-600 hover:text-yellow-600 transition-colors">
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Insightful</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-500 transition-colors">
                <ThumbsUp className="w-5 h-5" />
                <span className="font-medium">Like</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
                <span className="font-medium">Share</span>
              </button>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Discussion ({posts.length})
          </h2>

          {/* Comment Input */}
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {session?.user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'Y'}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows="3"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitComment}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="flex gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {post.profiles?.username || 'Anonymous'}
                    </p>
                    <span className="text-sm text-gray-500">
                      {getTimeAgo(post.created_at)}
                    </span>
                    {post.is_flagged && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">
                    {post.content}
                  </p>
                  
                  {/* Comment Reactions */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleReaction(post.id, 'love')}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{post.reactions?.love || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleReaction(post.id, 'insightful')}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>{post.reactions?.insightful || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleReaction(post.id, 'like')}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{post.reactions?.like || 0}</span>
                    </button>
                    <button className="text-sm text-gray-500 hover:text-blue-500 transition-colors ml-2">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}