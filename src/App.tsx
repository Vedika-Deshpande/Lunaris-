import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TopBar } from "@/components/dashboard/TopBar";
import Dashboard from "@/pages/Dashboard";
import Simulator from "@/pages/Simulator";
import Explore from "@/pages/Explore";
import Analysis from "@/pages/Analysis";
import Compare from "@/pages/Compare";
import TimelinePage from "@/pages/TimelinePage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TopBar />
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="explore" element={<Explore />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="compare" element={<Compare />} />
          <Route path="timeline" element={<TimelinePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
