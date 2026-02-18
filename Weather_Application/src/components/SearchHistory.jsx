import React from 'react';
import { Button } from 'react-bootstrap';

const SearchHistory = ({ history, onSelect }) => {
    if (!history.length) return null;

    return (
        <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
            {history.map((city, index) => (
                <Button
                    key={index}
                    variant="outline-light"
                    size="sm"
                    onClick={() => onSelect(city)}
                    className="glass-btn rounded-pill border-0 px-3"
                >
                    {city}
                </Button>
            ))}
        </div>
    );
};

export default SearchHistory;
