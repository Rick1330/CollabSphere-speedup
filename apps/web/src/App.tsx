import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers/app-providers";
import { AppRoutes } from "@/app/routing/app-routes";

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </BrowserRouter>
);

export default App;
