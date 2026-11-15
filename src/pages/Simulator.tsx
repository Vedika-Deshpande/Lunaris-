import Dashboard from "@/pages/Dashboard";

// Native React/three.js version of the original single-file simulator
// (Sun-fixed frame, orbiters, site markers). Shares the dashboard panels and mission store.
export default function Simulator() {
  return <Dashboard simulator />;
}
