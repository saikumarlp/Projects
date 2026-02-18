import React, { useState, useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Form, InputGroup, Button, ListGroup } from 'react-bootstrap';
import { getCitySuggestions } from '../services/weatherService';

const SearchBar = ({ onSearch }) => {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Click outside handler to close suggestions
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setCity(value);

    if (value.length >= 3) {
      const results = await getCitySuggestions(value);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setCity(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="w-100 mx-auto position-relative" style={{ maxWidth: '500px' }}>
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Search for a city..."
            value={city}
            onChange={handleInputChange}
            className="glass-input shadow-none"
            onFocus={() => city.length >= 3 && setShowSuggestions(true)}
            autoComplete="off"
          />
          <Button
            variant="outline-light"
            type="submit"
            className="glass-btn border-left-0"
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          >
            <FiSearch size={20} />
          </Button>
        </InputGroup>
      </Form>

      {showSuggestions && suggestions.length > 0 && (
        <ListGroup className="position-absolute w-100 mt-1 shadow-lg" style={{ zIndex: 1000, borderRadius: '15px', overflow: 'hidden' }}>
          {suggestions.map((suggestion, index) => (
            <ListGroup.Item
              key={index}
              action
              onClick={() => handleSelectSuggestion(suggestion)}
              className="bg-white/90 backdrop-blur-md border-0 text-dark hover:bg-gray-200 cursor-pointer"
              style={{ background: 'rgba(255, 255, 255, 0.9)' }}
            >
              {suggestion}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default SearchBar;
