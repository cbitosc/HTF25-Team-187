import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Navbar({ onSearch }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch current session on mount
  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);

      // Fetch profile if session exists
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, trust_score")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        // Fallback to email-based username
        setProfile({
          username: session?.user?.email?.split("@")[0] || "User",
          trust_score: 50,
        });
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  // Debounced search with 300ms delay
  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  // Handle sign in with GitHub OAuth
  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Generate initials from username for avatar fallback
  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const displayUsername =
    profile?.username || session?.user?.email?.split("@")[0] || "User";

  return (
    <nav className="bg-[#F3F3F3] backdrop-blur-sm shadow-sm py-3 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-6">
          {/* Left: App title and subtitle */}
          <div className="flex-shrink-0">
            <h1
              className="text-gray-900 text-lg font-semibold tracking-tight"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
              }}
            >
              AI-Powered Threads
            </h1>
            <p
              className="text-gray-500 text-sm"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
              }}
            >
              Discussion • Summarize • Moderate
            </p>
          </div>

          {/* Center: Search input */}
          <div className="hidden md:flex flex-1 max-w-[600px]">
            <input
              type="text"
              placeholder="Search threads, people..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label="Search threads and people"
              className="bg-white border border-[#E5E7EB] rounded-full px-4 py-2 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5D0FF] text-sm"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
              }}
            />
          </div>

          {/* Right: Auth section */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : session ? (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${displayUsername}'s avatar`}
                      className="w-9 h-9 rounded-full border border-white shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-white shadow-sm bg-[#A5D0FF] flex items-center justify-center text-white text-sm font-medium">
                      {getInitials(displayUsername)}
                    </div>
                  )}

                  {/* Username and trust score - hidden on mobile */}
                  <div className="hidden lg:flex flex-col">
                    <span
                      className="text-gray-900 text-sm font-medium"
                      style={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                      }}
                    >
                      {displayUsername}
                    </span>
                    <span className="bg-[#F1F9FF] text-[#A5D0FF] px-2 py-0.5 text-xs rounded-full border border-[#E6F0FF] inline-block w-fit">
                      Trust: {profile?.trust_score || 50}
                    </span>
                  </div>
                </div>

                {/* Sign out button */}
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                aria-label="Sign in with Google"
                className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Mobile search - shown below on small screens */}
        <div className="md:hidden mt-3">
          <input
            type="text"
            placeholder="Search threads, people..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search threads and people"
            className="bg-white border border-[#E5E7EB] rounded-full px-4 py-2 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5D0FF] text-sm"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            }}
          />
        </div>
      </div>
    </nav>
  );
}
