import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

import "./main.css";
import Home from "./Pages/Home.tsx";
import About from "./Pages/About.tsx";
import Games from "./Pages/Games.tsx";
import Tools from "./Pages/Tools.tsx";
import Contact from "./Pages/Contact.tsx";
import Login from "./Pages/Login.tsx";
const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={ <About/>} />
      <Route path="/login" element={ <Login/>} />
      <Route path="/contact" element={ <Contact/>} />
      <Route path="/tools" element={ <Tools/>} />
      <Route path="/tools/games" element={ <Games/>} />
    </Routes>
  </BrowserRouter>,
);