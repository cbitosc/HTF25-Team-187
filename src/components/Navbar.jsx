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
      setProfile({
        username: session?.user?.email?.split("@")[0] || "User",
        trust_score: 50,
      });
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

  // Handle sign in with Google OAuth
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
      setSession(null);
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
  const displayEmail = session?.user?.email || "";

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 bg-[#F3F3F3] backdrop-blur-sm shadow-sm px-8 py-3"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-6">
          {/* Left: App title */}
          <div className="flex-shrink-0">
            <h1 className="text-gray-900 text-xl font-semibold tracking-tight whitespace-nowrap">
              AI-Powered Threads
            </h1>
          </div>

          {/* Center: Search input */}
          <div className="flex-1 flex justify-center max-w-[400px] mx-auto">
            <input
              type="text"
              placeholder="Search threads, people..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label="Search threads and people"
              className="bg-white border border-gray-300 rounded-full px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-sm"
            />
          </div>

          {/* Right: Auth section */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            ) : session ? (
              <>
                {/* User info cluster */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${displayUsername}'s avatar`}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-[#007AFF] flex items-center justify-center text-white text-sm font-semibold">
                      {getInitials(displayUsername)}
                    </div>
                  )}

                  {/* Username, email, and trust score */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 text-sm font-semibold">
                        {displayUsername}
                      </span>
                      <span className="bg-[#E6F0FF] text-[#007AFF] text-xs px-2 py-0.5 font-medium rounded-full">
                        Trust: {profile?.trust_score || 50}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {displayEmail}
                    </span>
                  </div>
                </div>

                {/* Logout button - always visible */}
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors bg-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                aria-label="Sign in with Google"
                className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex flex-col gap-3">
            {/* Title and auth on same row */}
            <div className="flex items-center justify-between">
              <h1 className="text-gray-900 text-lg font-semibold tracking-tight">
                AI-Powered Threads
              </h1>

              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${displayUsername}'s avatar`}
                      className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-white shadow-sm bg-[#007AFF] flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(displayUsername)}
                    </div>
                  )}

                  {/* Logout button */}
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-100 text-gray-700 text-xs font-medium transition-colors bg-white"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  aria-label="Sign in with Google"
                  className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>

            {/* User info row on mobile (when logged in) */}
            {session && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-900 font-semibold">
                  {displayUsername}
                </span>
                <span className="bg-[#E6F0FF] text-[#007AFF] px-2 py-0.5 font-medium rounded-full">
                  Trust: {profile?.trust_score || 50}
                </span>
              </div>
            )}

            {/* Search input */}
            <input
              type="text"
              placeholder="Search threads, people..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label="Search threads and people"
              className="bg-white border border-gray-300 rounded-full px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-sm"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
