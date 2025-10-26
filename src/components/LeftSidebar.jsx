import React, { useState } from 'react';
import { TrendingUp, Home as HomeIcon, Menu, X, LayoutDashboard, PenSquare, Flame } from 'lucide-react';

export default function Sidebar({ onDashboard, onCreateThread }) {
  const [isOpen, setIsOpen] = useState(false);

  const trendingUsers = [
    { id: 1, name: 'Sarah Chen', avatar: '👩‍💻', followers: '12.5K' },
    { id: 2, name: 'Alex Morgan', avatar: '👨‍🎨', followers: '8.2K' },
    { id: 3, name: 'Jamie Lee', avatar: '👩‍🔬', followers: '6.7K' },
    { id: 4, name: 'Chris Park', avatar: '👨‍💼', followers: '5.1K' },
  ];

  const trendingThreads = [
    { id: 1, title: 'React 19 is here!', engagement: '2.3K' },
    { id: 2, title: 'Best VS Code extensions', engagement: '1.8K' },
    { id: 3, title: 'Tailwind vs CSS-in-JS', engagement: '1.5K' },
    { id: 4, title: 'Remote work tips', engagement: '1.2K' },
  ];

  return (
    <>
    
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-lg bg-white text-gray-900 shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
       {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 top-16"
          onClick={() => setIsOpen(false)}
        />
      )} 

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } bg-white border-r border-gray-200 w-64`}
      >
        <div className="p-4 space-y-4">
          {/* Home Button */}
          {/* <button className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-semibold transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-900">
            <HomeIcon className="w-5 h-5" />
            Home
          </button> */}

          {/* Dashboard Button */}
          <button 
            onClick={onDashboard}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          {/* Create New Thread Button */}
          <button 
            onClick={onCreateThread}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors duration-200"
          >
            <PenSquare className="w-5 h-5" />
            Create Thread
          </button>

          {/* Trending Threads */}
          <div className="rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-900">
                Trending Threads
              </h3>
            </div>
            <div className="space-y-2">
              {trendingThreads.map(thread => (
                <div
                  key={thread.id}
                  className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-200"
                >
                  <p className="font-medium text-sm truncate text-gray-900">
                    {thread.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {thread.engagement} engaged
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Users */}
          <div className="rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-gray-900">
                Trending Users
              </h3>
            </div>
            <div className="space-y-2">
              {trendingUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-200"
                >
                  <div className="text-2xl">{user.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.followers} followers
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}