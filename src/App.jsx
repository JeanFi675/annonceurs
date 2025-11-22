import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MapComponent from './components/Map';
import Sidebar from './components/Sidebar';
import EntityDetails from './pages/EntityDetails';
import { fetchEntities } from './services/api';

function App() {
  const [entities, setEntities] = useState([]);
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [filters, setFilters] = useState({
    Statuts: '',
    Type: '',
    Referent: '',
    Search: ''
  });

  const loadData = async () => {
    const data = await fetchEntities();
    console.log('Loaded entities:', data);
    setEntities(data);
    setFilteredEntities(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = entities;

    if (filters.Statuts) {
      result = result.filter(e => e.Statuts === filters.Statuts);
    }
    if (filters.Type) {
      result = result.filter(e => e.Type === filters.Type);
    }
    if (filters.Referent) {
      if (filters.Referent === 'Non attribué') {
        result = result.filter(e => !e.Référent_partenariat_club);
      } else {
        result = result.filter(e => e.Référent_partenariat_club === filters.Referent);
      }
    }
    if (filters.Search) {
      const searchLower = filters.Search.toLowerCase();
      result = result.filter(e =>
        (e.title && e.title.toLowerCase().includes(searchLower)) ||
        (e.address && e.address.toLowerCase().includes(searchLower)) ||
        (e.Place && e.Place.toLowerCase().includes(searchLower)) // Search in Google Maps URL too just in case
      );
    }

    setFilteredEntities(result);
  }, [filters, entities]);

  const [newLocation, setNewLocation] = useState(null); // { lat, lng }
  const [isAddMode, setIsAddMode] = useState(false);

  const handleMapClick = (lat, lng) => {
    setNewLocation({ lat, lng });
    // Optionally open the sidebar modal if not open, but for now just set state
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="app-container">
            <div className="sidebar">
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                entities={entities}
                refreshEntities={loadData}
                newLocation={newLocation}
                setNewLocation={setNewLocation}
                setIsAddMode={setIsAddMode}
              />
            </div>
            <div className="map-container">
              <MapComponent
                entities={filteredEntities}
                onMapClick={handleMapClick}
                newLocation={newLocation}
                isAddMode={isAddMode}
                setIsAddMode={setIsAddMode}
              />
            </div>
          </div>
        } />
        <Route path="/entity/:id" element={<EntityDetails entities={entities} />} />
      </Routes>
    </Router>
  );
}

export default App;
