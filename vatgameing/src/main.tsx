import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

import "./main.css";
import Home from "./Pages/Home.tsx";
import About from "./Pages/About.tsx";
const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={ <About/>} />
    </Routes>
  </BrowserRouter>,
);