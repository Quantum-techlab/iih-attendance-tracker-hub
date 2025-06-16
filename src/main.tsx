
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedDemoData } from './utils/seedData'

// Initialize demo data for testing
seedDemoData();

createRoot(document.getElementById("root")!).render(<App />);
