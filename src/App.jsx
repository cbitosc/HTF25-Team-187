import React from "react";
import Navbar from "./components/Navbar";
import LeftSidebar from "./components/LeftSidebar"
function App() {
  return( 
    <>
  <Navbar onSearch={(query) => console.log("Search:", query)} />
   <div className="flex pt-16">
        <LeftSidebar />
        
        <main className="flex-1">
          {/* Your content */}
        </main>
      </div>
  </>
  )
}

export default App;
