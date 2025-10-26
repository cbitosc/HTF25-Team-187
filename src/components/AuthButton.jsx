// client/src/components/AuthButton.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function AuthButton({ onLogin }) {
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Get session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) onLogin?.(session.user.id);
    });

    // Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) onLogin?.(session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowAuth(false);
    setSession(null);
    onLogin?.(null);
  }

  return (
    <div className="flex flex-col items-center mb-6">
      {session ? (
        <>
          <p className="text-gray-400 mb-2">Logged in as: {session.user.email}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setShowAuth(!showAuth)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {showAuth ? "Close Login" : "Login"}
          </button>

          {showAuth && (
            <div className="bg-gray-800 p-4 mt-4 rounded-lg w-full max-w-sm shadow-lg">
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={["google"]}
                theme="dark"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
