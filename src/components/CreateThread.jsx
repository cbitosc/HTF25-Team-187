import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { getToxicityScore } from "../utils/perspective";

export default function CreateThreadPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/create-thread",
        },
      });
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    if (formData.title.length > 100) return;

    setSubmitting(true);

    try {
      // 1️⃣ Calculate toxicity score
      const combinedText = `${formData.title} ${formData.description}`;
      const toxicityScore = await getToxicityScore(combinedText);

      // 2️⃣ Create the thread with toxicity score
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          created_by: session.user.id,
          toxicity_score: toxicityScore, // ✅ Added field
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // 3️⃣ Create root post linked to thread
      const { error: postError } = await supabase.from("posts").insert({
        thread_id: thread.id,
        author_id: session.user.id,
        content: formData.description.trim(),
      });

      if (postError) throw postError;

      // 4️⃣ Show success
      setShowSuccess(true);
      setSubmitting(false);
    } catch (error) {
      console.error("Error creating thread or post:", error);
      setSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setFormData({ title: "", description: "" });
    setShowSuccess(false);
    setSubmitting(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div
        className="bg-gradient-to-br from-[#F3F3F3] via-[#E8F4FF] to-[#F3F3F3] min-h-screen flex items-center justify-center"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#A5D0FF] border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-[#A5D0FF] opacity-20 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="bg-gradient-to-br from-[#F3F3F3] via-[#E8F4FF] to-[#F3F3F3] min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#A5D0FF] opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#A5D0FF] opacity-10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl border border-white/50 p-12 max-w-md w-full transform transition-all duration-500 hover:scale-105">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#A5D0FF] to-[#7EC0FF] rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:rotate-12">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">
                Welcome
              </h2>
              <p className="text-gray-600 text-lg">
                Please sign in to create a thread.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              className="group relative mt-4 bg-white border-2 border-gray-200 rounded-2xl px-8 py-4 text-gray-700 font-semibold hover:border-[#A5D0FF] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#A5D0FF]/0 via-[#A5D0FF]/10 to-[#A5D0FF]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div
        className="bg-gradient-to-br from-[#F3F3F3] via-[#E8F4FF] to-[#F3F3F3] min-h-screen flex items-center justify-center p-6"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        <div className="text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-2xl animate-bounce-slow">
            <svg
              className="w-16 h-16 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-gray-800">
              Thread Created!
            </h2>
            <p className="text-xl text-gray-600">
              Your thread has been successfully published.
            </p>
          </div>

          <button
            onClick={handleCreateAnother}
            className="group relative bg-gradient-to-r from-[#A5D0FF] to-[#93C9FF] text-gray-900 font-semibold rounded-2xl px-10 py-4 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative">Create Another Thread</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-[#F3F3F3] via-[#E8F4FF] to-[#F3F3F3] w-[80vw] p-6 relative overflow-hidden"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <div className="absolute w-[12vw] inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-22 h-22 bg-[#A5D0FF] opacity-20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#A5D0FF] opacity-15 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="max-w-4xl mx-auto relative">
        <div className="mb-12 text-center animate-slide-down">
          <div className="text-3xl mt-12 font-bold text-gray-800 mb-3 tracking-tight">
            Create a New Thread
          </div>
          <p className="text-xl text-gray-600">
            Share your thoughts with the community
          </p>
        </div>

        <div className="h-[75vh] backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/50 p-10 space-y-8 animate-slide-up">
          <div className="space-y-0">
            <label
              htmlFor="title"
              className="text-gray-700 text-base font-semibold block"
            >
              Thread Title
            </label>
            <div className="relative">
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                maxLength={100}
                placeholder="Enter an engaging title..."
                className="bg-white/90 border-2 border-gray-200 rounded-2xl w-full p-4 text-gray-800 text-lg placeholder-gray-400 focus:outline-none focus:border-[#A5D0FF] focus:ring-4 focus:ring-[#A5D0FF]/20 transition-all duration-300"
              />
              <div className="absolute right-4 bottom-4 text-sm font-medium text-gray-400">
                {formData.title.length}/100
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="description"
              className="text-gray-700 text-base font-semibold block"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={8}
              placeholder="Share your thoughts in detail..."
              className="bg-white/90 border-2 border-gray-200 rounded-2xl w-full h-32 p-4 text-gray-800 text-lg placeholder-gray-400 focus:outline-none focus:border-[#A5D0FF] focus:ring-4 focus:ring-[#A5D0FF]/20 transition-all duration-300"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !formData.title.trim() ||
              !formData.description.trim()
            }
            className="group relative w-full bg-gradient-to-r from-[#A5D0FF] to-[#93C9FF] text-gray-900 font-bold text-lg rounded-2xl px-8 py-5 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#93C9FF] to-[#7EC0FF] translate-y-[100%] group-hover:translate-y-0 group-disabled:translate-y-[100%] transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center space-x-2">
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Thread...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Create Thread</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 30px) scale(1.05);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.6s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
