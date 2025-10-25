// client/src/components/CreateThread.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function CreateThread({ userId, onThreadCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) return alert("Please enter a title");
    if (!userId) return alert("You must be logged in to create a thread!");

    setLoading(true);

    const { error } = await supabase.from("threads").insert([
      {
        title,
        description,
        created_by: userId,
      },
    ]);

    if (error) {
      console.error("Error creating thread:", error.message);
      alert("Failed to create thread. Check console for details.");
    } else {
      setTitle("");
      setDescription("");
      onThreadCreated?.();
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 bg-gray-800 p-4 rounded-lg shadow-lg"
    >
      <input
        type="text"
        className="w-full p-2 mb-2 bg-gray-700 rounded text-white"
        placeholder="Thread title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full p-2 mb-2 bg-gray-700 rounded text-white"
        placeholder="Thread description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded w-full"
      >
        {loading ? "Creating..." : "Create Thread"}
      </button>
    </form>
  );
}
