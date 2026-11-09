import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

import "./main.css";
import Home from "./Pages/Home.tsx";
import About from "./Pages/About.tsx";
import Games from "./Pages/Games.tsx";
import Tools from "./Pages/Tools.tsx";
import Contact from "./Pages/Contact.tsx";
import Login from "./Pages/Login.tsx";
import Signup from "./Pages/Signup.tsx";
import ForgotPassword from "./Pages/ForgotPassword.tsx";
import Onboarding from "./Pages/Onboarding.tsx";
import Dashboard from "./Pages/Dashboard.tsx";
import Settings from "./Pages/Settings.tsx";
import ProtectedRoute from "./Components/ProtectedRoute.tsx";
import OnboardingGate from "./Components/OnboardingGate.tsx";
const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <Routes>
      <Route element={<OnboardingGate />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={ <About/>} />
        <Route path="/login" element={ <Login/>} />
        <Route path="/signup" element={ <Signup/>} />
        <Route path="/forgot-password" element={ <ForgotPassword/>} />
        <Route path="/contact" element={ <Contact/>} />
        <Route path="/settings" element={ <Settings/>} />
        <Route path="/tools" element={ <Tools/>} />
        <Route path="/tools/games" element={ <Games/>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={ <Onboarding/>} />
          <Route path="/dashboard" element={ <Dashboard/>} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>,
);