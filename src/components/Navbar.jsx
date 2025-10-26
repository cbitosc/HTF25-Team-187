import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Navbar({ onSearch }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch current session on mount
  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
    };

    initSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from database
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, trust_score")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      // Fallback to email-derived username
      setProfile({
        username: session?.user?.email?.split("@")[0] || "User",
        trust_score: null,
      });
    } else {
      setProfile(data);
    }
  };

  // Debounced search handler
  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Handle sign in
  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 1).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.substring(0, 1).toUpperCase();
    }
    return "U";
  };

  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const displayUsername =
    profile?.username || session?.user?.email?.split("@")[0] || "User";

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 bg-[#F3F3F3] backdrop-blur-sm shadow-sm py-3 px-6"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Left: App Title */}
          <div className="flex-shrink-0">
            <h1 className="text-gray-900 text-lg font-semibold tracking-tight">
              Threads
            </h1>
            <p className="text-gray-500 text-sm hidden md:block">
              Discussion • Summarize • Moderate
            </p>
          </div>

          {/* Center: Search Input */}
          <div className="flex-1 max-w-[600px] hidden md:block">
            <input
              type="text"
              placeholder="Search threads, people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search threads and people"
              className="bg-white border border-[#E5E7EB] rounded-full px-4 py-2 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5D0FF] text-sm"
            />
          </div>

          {/* Right: Auth Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : session ? (
              <>
                {/* Avatar */}
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${displayUsername}'s avatar`}
                      className="w-9 h-9 rounded-full border border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-white shadow-sm bg-[#A5D0FF] flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials()}
                    </div>
                  )}
                </div>

                {/* Username and Trust Score (hidden on mobile) */}
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-gray-900 text-sm font-medium">
                    {displayUsername}
                  </span>
                  {profile?.trust_score !== null &&
                    profile?.trust_score !== undefined && (
                      <span className="bg-[#F1F9FF] text-[#A5D0FF] px-2 py-0.5 text-xs rounded-full border border-[#E6F0FF]">
                        Trust: {profile.trust_score}
                      </span>
                    )}
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <span className="hidden md:inline">Sign out</span>
                  <span className="md:hidden">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                aria-label="Sign in with Google"
                className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search (below main nav) */}
        <div className="mt-3 md:hidden">
          <input
            type="text"
            placeholder="Search threads, people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search threads and people"
            className="bg-white border border-[#E5E7EB] rounded-full px-4 py-2 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A5D0FF] text-sm"
          />
        </div>
      </div>
    </nav>
  );
}
