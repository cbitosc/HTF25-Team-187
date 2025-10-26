import { supabase } from "../supabaseClient.js";
import { summarizeText } from "../utils/gemini.js";
import { getToxicityScore } from "../../src/utils/perspective.js";

export async function createPost(req, res) {
  const { author_id, content, thread_id, parent_id } = req.body;

  try {
    // 1️⃣ Check toxicity
    const toxicity = await getToxicityScore(content);
    const is_flagged = toxicity > 0.7; // flag if score > 0.7

    // 2️⃣ Insert post into Supabase
    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          author_id,
          content,
          thread_id,
          parent_id,
          toxicity_score: toxicity,
          is_flagged,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ post: data, flagged: is_flagged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
}

export async function summarizePost(req, res) {
  const { id } = req.params;

  try {
    // Fetch post content
    const { data: post, error } = await supabase
      .from("posts")
      .select("content")
      .eq("id", id)
      .single();

    if (error) throw error;

    const summary = await summarizeText(post.content);
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize post" });
  }
}
