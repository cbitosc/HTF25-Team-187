// client/src/components/ThreadList.jsx
import PostList from "./PostList";

export default function ThreadList({ threads, userId }) {
  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <div key={thread.id} className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold">{thread.title}</h2>
          <p className="text-gray-400">{thread.description}</p>
          <PostList threadId={thread.id} userId={userId} />
        </div>
      ))}
    </div>
  );
}
