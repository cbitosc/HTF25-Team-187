import React from "react";
import Navbar from "./components/Navbar";

function App() {
  return <Navbar onSearch={(query) => console.log("Search:", query)} />;
}

export default App;
