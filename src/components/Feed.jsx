import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import PostList from './PostList';
import CreatePostBox from './CreatePostBox';
import { motion, AnimatePresence } from 'framer-motion';

const Feed = () => {
  const [activeTab, setActiveTab] = useState('recents');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    };
    getUser();
  }, []);

  // Fetch posts based on active tab
  useEffect(() => {
    fetchPosts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, user]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            trust_score
          ),
          threads:thread_id (
            title
          )
        `)
        .is('parent_id', null) // Only top-level posts
        .order('created_at', { ascending: false });

      // Filter based on tab
      if (activeTab === 'friends' && user) {
        // TODO: Implement friends logic when friends table is added
        // For now, show posts from users with high trust scores
        query = query.gte('profiles.trust_score', 70);
      } else if (activeTab === 'popular') {
        // Order by engagement (reactions count - to be implemented)
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload) => {
    if (payload.eventType === 'INSERT') {
      // Fetch the new post with profile data
      fetchNewPost(payload.new.id);
    } else if (payload.eventType === 'UPDATE') {
      setPosts(prev => prev.map(post => 
        post.id === payload.new.id ? { ...post, ...payload.new } : post
      ));
    } else if (payload.eventType === 'DELETE') {
      setPosts(prev => prev.filter(post => post.id !== payload.old.id));
    }
  };

  const fetchNewPost = async (postId) => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          trust_score
        ),
        threads:thread_id (
          title
        )
      `)
      .eq('id', postId)
      .single();

    if (data && !data.parent_id) {
      setPosts(prev => [data, ...prev]);
    }
  };

  const handlePostCreated = () => {
    fetchPosts(); // Refresh feed
  };

  const tabs = [
    { id: 'recents', label: 'Recents', icon: '🕐' },
    { id: 'friends', label: 'Friends', icon: '👥' },
    { id: 'popular', label: 'Popular', icon: '🔥' }
  ];

  return (
    <div className="feed-container max-w-3xl mx-auto px-4 py-6">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feed</h1>
        <p className="text-gray-600">Stay updated with the latest discussions</p>
      </motion.div>

      {/* Create Post Box */}
      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <CreatePostBox 
            user={user} 
            userProfile={userProfile}
            onPostCreated={handlePostCreated}
          />
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-6"
      >
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Posts Feed */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center"
          >
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'friends' 
                ? "Your friends haven't posted anything yet"
                : activeTab === 'popular'
                ? "No popular posts at the moment"
                : "Be the first to start a conversation!"}
            </p>
            {user && (
              <button
                onClick={() => document.querySelector('.create-post-textarea')?.focus()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
              >
                Create First Post
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="posts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PostList posts={posts} currentUser={user} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load More Button (for pagination - future enhancement) */}
      {!loading && posts.length > 0 && posts.length >= 50 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <button
            onClick={fetchPosts}
            className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-blue-500 hover:text-blue-500 transition-all duration-300"
          >
            Load More Posts
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Feed;