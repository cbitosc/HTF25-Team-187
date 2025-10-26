import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  Flag,
  TrendingUp,
  Search,
  Brain,
} from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalThreads: 0,
    totalPosts: 0,
    flaggedPending: 0,
    flaggedApproved: 0,
    flaggedRemoved: 0,
    avgSentiment: 0,
    totalUsers: 0,
  });

  const [flaggedContent, setFlaggedContent] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [toxicThreads, setToxicThreads] = useState([]);
  const [userTrustData, setUserTrustData] = useState([]);
  const [threadSummaries, setThreadSummaries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch overview statistics
  const fetchStats = async () => {
    try {
      const [threads, posts, flagged, users] = await Promise.all([
        supabase.from("threads").select("sentiment_score", { count: "exact" }),
        supabase.from("posts").select("*", { count: "exact" }),
        supabase.from("flagged_content").select("status"),
        supabase.from("profiles").select("*", { count: "exact" }),
      ]);

      const flaggedByStatus = flagged.data?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const avgSentiment =
        threads.data?.reduce((sum, t) => sum + (t.sentiment_score || 0), 0) /
        (threads.data?.length || 1);

      setStats({
        totalThreads: threads.count || 0,
        totalPosts: posts.count || 0,
        flaggedPending: flaggedByStatus?.pending || 0,
        flaggedApproved: flaggedByStatus?.approved || 0,
        flaggedRemoved: flaggedByStatus?.removed || 0,
        avgSentiment: avgSentiment.toFixed(2),
        totalUsers: users.count || 0,
      });
    } catch (err) {
      setError("Failed to fetch statistics");
      console.error(err);
    }
  };

  // Fetch flagged content
  const fetchFlaggedContent = async () => {
    try {
      const { data, error } = await supabase
        .from("flagged_content")
        .select(
          `
          *,
          posts (content, author_id),
          profiles (username)
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFlaggedContent(data || []);
    } catch (err) {
      console.error("Error fetching flagged content:", err);
    }
  };

  // Fetch sentiment analytics
  const fetchSentimentData = async () => {
    try {
      const { data, error } = await supabase
        .from("threads")
        .select("id, title, sentiment_score, toxicity_score")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const chartData =
        data?.map((t) => ({
          name: t.title?.substring(0, 20) + "..." || `Thread ${t.id}`,
          sentiment: t.sentiment_score || 0,
          toxicity: t.toxicity_score || 0,
        })) || [];

      setSentimentData(chartData);

      // Get top 5 toxic threads
      const toxic = [...(data || [])]
        .sort((a, b) => (b.toxicity_score || 0) - (a.toxicity_score || 0))
        .slice(0, 5);
      setToxicThreads(toxic);
    } catch (err) {
      console.error("Error fetching sentiment data:", err);
    }
  };

  // Fetch user trust data
  const fetchUserTrustData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, trust_score")
        .order("trust_score", { ascending: true })
        .limit(20);

      if (error) throw error;
      setUserTrustData(data || []);
    } catch (err) {
      console.error("Error fetching user trust data:", err);
    }
  };

  // Fetch thread summaries
  const fetchThreadSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from("threads")
        .select("id, title, summary")
        .not("summary", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setThreadSummaries(data || []);
    } catch (err) {
      console.error("Error fetching summaries:", err);
    }
  };

  // Handle moderation actions
  const handleModeration = async (flagId, action) => {
    try {
      const { error } = await supabase
        .from("flagged_content")
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq("id", flagId);

      if (error) throw error;

      await fetchFlaggedContent();
      await fetchStats();
    } catch (err) {
      console.error("Error updating flag status:", err);
      alert("Failed to update status");
    }
  };

  // Initialize data and setup real-time subscription
  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchFlaggedContent(),
        fetchSentimentData(),
        fetchUserTrustData(),
        fetchThreadSummaries(),
      ]);
      setLoading(false);
    };

    initDashboard();

    // Setup real-time subscription for flagged content
    const channel = supabase
      .channel("flagged_content_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flagged_content" },
        () => {
          fetchFlaggedContent();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter flagged content by search term
  const filteredFlaggedContent = flaggedContent.filter((item) => {
    const author = item.profiles?.username || "";
    const reason = item.reason || "";
    return (
      author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-12 w-[80vw] bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your AI-Powered Threads platform
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Section 1: Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<MessageSquare className="h-6 w-6 text-blue-600" />}
            title="Total Threads"
            value={stats.totalThreads}
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<MessageSquare className="h-6 w-6 text-green-600" />}
            title="Total Posts"
            value={stats.totalPosts}
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<Flag className="h-6 w-6 text-orange-600" />}
            title="Flagged Content"
            value={stats.flaggedPending}
            subtitle={`${stats.flaggedApproved} approved, ${stats.flaggedRemoved} removed`}
            bgColor="bg-orange-50"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
            title="Avg Sentiment"
            value={stats.avgSentiment}
            subtitle={`${stats.totalUsers} total users`}
            bgColor="bg-purple-50"
          />
        </div>

        {/* Section 2: Flagged Content Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Flagged Content
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by author or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Post ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Toxicity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFlaggedContent.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No flagged content found
                    </td>
                  </tr>
                ) : (
                  filteredFlaggedContent.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.post_id?.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.profiles?.username || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.reason || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.toxicity_score > 0.7
                              ? "bg-red-100 text-red-800"
                              : item.toxicity_score > 0.4
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {(item.toxicity_score || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleModeration(item.id, "approved")
                              }
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleModeration(item.id, "removed")
                              }
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Section 3: Sentiment & Toxicity Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Sentiment & Toxicity Analysis
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sentiment" fill="#3b82f6" name="Sentiment" />
                <Bar dataKey="toxicity" fill="#ef4444" name="Toxicity" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Top 5 Most Toxic Threads
              </h3>
              <div className="space-y-2">
                {toxicThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-900 truncate flex-1">
                      {thread.title || `Thread ${thread.id}`}
                    </span>
                    <span className="ml-3 px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
                      {(thread.toxicity_score || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: User Trust Insights */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              User Trust Insights
            </h2>
            <div className="overflow-y-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trust Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userTrustData.map((user) => (
                    <tr
                      key={user.id}
                      className={user.trust_score < 40 ? "bg-red-50" : ""}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                user.trust_score < 40
                                  ? "bg-red-500"
                                  : user.trust_score < 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${user.trust_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                            {user.trust_score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bonus: AI Summary Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              AI Thread Summaries
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {threadSummaries.map((thread) => (
              <div
                key={thread.id}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {thread.title}
                </h3>
                <p className="text-sm text-gray-600">{thread.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Components
const StatCard = ({ icon, title, value, subtitle, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-6 shadow-sm`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
    </div>
    <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    removed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
};

export default Dashboard;
