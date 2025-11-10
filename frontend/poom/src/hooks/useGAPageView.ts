import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_ID = import.meta.env.VITE_GA_ID;

export function useGAPageView() {
  const location = useLocation();

  useEffect(() => {
    if (!window.gtag || !GA_ID) return;
    window.gtag("config", GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);
}