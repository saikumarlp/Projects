import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert, Badge, Nav } from 'react-bootstrap';
import { getHistoricalWeather, getHistoricalWeatherRange } from '../services/weatherService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HistoricalWeather = ({ locationName }) => {
    const [mode, setMode] = useState('single'); // 'single' or 'range'
    const [date, setDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [historicalData, setHistoricalData] = useState(null);
    const [rangeData, setRangeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setHistoricalData(null);
        setRangeData(null);

        try {
            if (mode === 'single') {
                if (!date) return;
                const data = await getHistoricalWeather(locationName, date);
                setHistoricalData(data);
            } else {
                if (!startDate || !endDate) return;
                const data = await getHistoricalWeatherRange(locationName, startDate, endDate);
                setRangeData(data);
            }
        } catch (err) {
            setError(err.message || "Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-100 mt-5">
            <h3 className="h5 mb-3 opacity-90">Historical Weather Analysis</h3>
            <Card className="glass-card border-0 p-3">
                <Card.Body>
                    <Nav variant="pills" className="mb-4 justify-content-center glass-pills">
                        <Nav.Item>
                            <Nav.Link
                                active={mode === 'single'}
                                onClick={() => setMode('single')}
                                className={mode === 'single' ? 'bg-light text-dark font-weight-bold' : 'text-white'}
                            >
                                Single Day
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                active={mode === 'range'}
                                onClick={() => setMode('range')}
                                className={mode === 'range' ? 'bg-light text-dark font-weight-bold' : 'text-white'}
                            >
                                Date Range (Chart)
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>

                    <Form onSubmit={handleSearch} className="mb-4">
                        <Row className="align-items-end">
                            {mode === 'single' ? (
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label>Select Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="glass-input"
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    </Form.Group>
                                </Col>
                            ) : (
                                <>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>From</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="glass-input"
                                                max={new Date().toISOString().split("T")[0]}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>To</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="glass-input"
                                                max={new Date().toISOString().split("T")[0]}
                                            />
                                        </Form.Group>
                                    </Col>
                                </>
                            )}
                            <Col md={4}>
                                <Button
                                    type="submit"
                                    variant="light"
                                    className="glass-btn w-100 mt-3 mt-md-0"
                                    disabled={loading || !locationName}
                                >
                                    {loading ? 'Analyzing...' : 'Analyze'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    {error && (
                        <Alert variant="warning" className="text-dark bg-warning-subtle border-warning">
                            {error}
                        </Alert>
                    )}

                    {/* Single Day View */}
                    {mode === 'single' && historicalData && historicalData.historical && (
                        <div className="mt-4 animate-fade-in">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Weather on {date}:</h5>
                                {historicalData.is_mock && <Badge bg="warning" text="dark">Simulated Data</Badge>}
                            </div>
                            {Object.entries(historicalData.historical).map(([d, data]) => (
                                <div key={d} className="d-flex align-items-center justify-content-around p-3 bg-white/10 rounded">
                                    <div className="text-center">
                                        <div className="h4 mb-0">{data.avgtemp}°</div>
                                        <small>Avg Temp</small>
                                    </div>
                                    <div className="text-center">
                                        <div className="h4 mb-0">{data.maxtemp}°</div>
                                        <small>Max</small>
                                    </div>
                                    <div className="text-center">
                                        <div className="h4 mb-0">{data.mintemp}°</div>
                                        <small>Min</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Range View (Chart) */}
                    {mode === 'range' && rangeData && rangeData.history && (
                        <div className="mt-4 animate-fade-in" style={{ height: '300px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Temperature Trend</h5>
                                {rangeData.is_mock && <Badge bg="warning" text="dark">Simulated Data</Badge>}
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={rangeData.history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff30" />
                                    <XAxis dataKey="date" stroke="white" tick={{ fill: 'white' }} />
                                    <YAxis stroke="white" tick={{ fill: 'white' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', color: 'white' }}
                                        itemStyle={{ color: 'white' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="maxtemp" stroke="#ff7675" name="Max Temp" strokeWidth={2} />
                                    <Line type="monotone" dataKey="mintemp" stroke="#74b9ff" name="Min Temp" strokeWidth={2} />
                                    <Line type="monotone" dataKey="avgtemp" stroke="#f6e58d" name="Avg Temp" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default HistoricalWeather;
