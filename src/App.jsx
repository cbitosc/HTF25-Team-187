import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LeftSidebar from "./components/LeftSidebar";
import CreateThread from "./components/CreateThread";
import Home from "./components/Home";
import ThreadPage from "./components/ThreadPage";
import Dashboard from "./components/Dashboard";

// Add this route
function App() {
  return (
    <Router>
      <Navbar onSearch={(query) => console.log("Search:", query)} />
      <div className="flex pt-16">
        <LeftSidebar />
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-thread" element={<CreateThread />} />
            <Route path="/thread/:id" element={<ThreadPage />} />
            <Route path="/user/:id/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
