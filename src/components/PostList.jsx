// client/src/components/PostList.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function PostList({ threadId, userId }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch posts for this thread
  useEffect(() => {
    if (threadId) fetchPosts();
  }, [threadId]);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) console.error("Error fetching posts:", error);
    else setPosts(data);
  }

  async function addPost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;

    if (!userId) {
      console.error("User not logged in");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("posts").insert([
      {
        thread_id: threadId,
        content: newPost,
        author_id: userId, // matches RLS insert policy
      },
    ]);

    if (error) console.error("Error adding post:", error);
    else {
      setNewPost("");
      fetchPosts();
    }

    setLoading(false);
  }

  return (
    <div className="mt-4 border-t border-gray-700 pt-4">
      <form onSubmit={addPost} className="flex mb-3">
        <input
          type="text"
          placeholder="Write a reply..."
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="flex-1 bg-gray-700 p-2 rounded-l text-white"
          disabled={!userId || loading}
        />
        <button
          type="submit"
          className="bg-green-500 px-4 rounded-r"
          disabled={!userId || loading}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">No replies yet.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="bg-gray-700 p-2 rounded">
              {p.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
