import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LeadsPage from './pages/LeadsPage';
import AddLeadPage from './pages/AddLeadspage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<LeadsPage />} />
          <Route path="/add" element={<AddLeadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;