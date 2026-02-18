import React from 'react';
import { motion } from 'framer-motion';
import { Card, Row, Col } from 'react-bootstrap';

const Forecast = ({ data, unit }) => {
    if (!data || !data.forecast) {
        return (
            <div className="text-center p-4 glass-card rounded">
                <p className="mb-0 opacity-80">Secondary forecast data not available.</p>
            </div>
        );
    }

    const forecastDays = Object.entries(data.forecast);

    return (
        <div className="w-100">
            <h3 className="h5 mb-4 px-2 opacity-90">5-Day Forecast</h3>
            <Row className="flex-nowrap overflow-auto pb-2 scrollbar-hide">
                {forecastDays.map(([date, dayData], index) => (
                    <Col key={date} xs={6} sm={4} md={3} lg={2} className="mb-3">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                        >
                            <Card className="glass-card text-center h-100 border-0">
                                <Card.Body className="p-3 d-flex flex-column align-items-center justify-content-center">
                                    <p className="font-weight-bold mb-2">
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </p>
                                    <div className="h2 my-2">🌥️</div>
                                    <div className="d-flex gap-2 font-weight-bold">
                                        <span>{dayData.maxtemp}°</span>
                                        <span className="opacity-50">{dayData.mintemp}°</span>
                                    </div>
                                    <small className="mt-2 opacity-75 d-block">
                                        Avg: {dayData.avgtemp}°
                                    </small>
                                </Card.Body>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default Forecast;
