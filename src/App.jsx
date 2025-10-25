import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import ThreadList from "./components/ThreadList";
import CreateThread from "./components/CreateThread";
import AuthButton from "./components/AuthButton";

function App() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  async function fetchThreads() {
    const { data, error } = await supabase
      .from("threads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching threads:", error);
    else setThreads(data);

    setLoading(false);
  }

  async function ensureProfile(user) {
    if (!user) return;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      const username =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "user_" + user.id.slice(0, 6);

      const { error } = await supabase.from("profiles").insert([
        {
          id: user.id,
          username,
        },
      ]);

      if (error) console.error("Error creating profile:", error);
      else console.log("✅ Profile created for:", username);
    }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id || null;
      setUserId(uid);

      if (session?.user) await ensureProfile(session.user);

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          const newUserId = newSession?.user?.id || null;
          setUserId(newUserId);

          if (event === "SIGNED_IN" && newSession?.user) {
            await ensureProfile(newSession.user);
          }
        }
      );

      fetchThreads();

      return () => listener.subscription.unsubscribe();
    }

    init();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-white p-8">
      <h1 className="text-3xl text-red-500 font-bold mb-6 text-center">
        AI-Powered Threads 🧠
      </h1>

      <div className="flex justify-center mb-6">
        <AuthButton onLogin={setUserId} />
      </div>

      {userId && (
        <CreateThread
          userId={userId}
          onThreadCreated={fetchThreads}
          key={userId}
        />
      )}

      {loading ? (
        <p className="text-center mt-8 text-gray-400">
          Loading threads...
        </p>
      ) : (
        <ThreadList threads={threads} userId={userId} />
      )}
    </div>
  );
}

export default App;