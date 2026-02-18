import React from 'react';
import { WiHumidity, WiStrongWind, WiBarometer, WiThermometer, WiCloud, WiDaySunny } from 'react-icons/wi';
import { MdVisibility } from 'react-icons/md';
import { Row, Col, Card } from 'react-bootstrap';

const CurrentWeather = ({ data, unit }) => {
    const { location, current } = data;
    const { name } = location;
    const {
        temperature,
        weather_icons,
        weather_descriptions,
        wind_speed,
        wind_dir,
        pressure,
        humidity,
        feelslike,
        uv_index,
        visibility,
        cloudcover
    } = current;

    return (
        <div className="text-white">
            <Row className="align-items-center">
                {/* Main Info */}
                <Col md={5} className="text-center text-md-left mb-4 mb-md-0 d-flex flex-column align-items-center align-items-md-start">
                    <h2 className="display-4 font-weight-bold">{name}</h2>
                    <div className="d-flex align-items-center">
                        {weather_icons && (
                            <img
                                src={weather_icons[0]}
                                alt={weather_descriptions[0]}
                                style={{ width: '100px', height: '100px' }}
                                className="mr-3 rounded-circle shadow-sm"
                            />
                        )}
                        <div>
                            <span className="display-1 font-weight-bold">
                                {temperature}°
                            </span>
                            <p className="lead text-capitalize opacity-90 mb-0">
                                {weather_descriptions[0]}
                            </p>
                        </div>
                    </div>
                </Col>

                {/* Details Grid */}
                <Col md={7}>
                    <Card className="glass-card border-0 p-3">
                        <Card.Body>
                            <Row>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <WiThermometer size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Feels Like</small>
                                            <div className="h6 mb-0 font-weight-bold">{feelslike}°</div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <WiHumidity size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Humidity</small>
                                            <div className="h6 mb-0 font-weight-bold">{humidity}%</div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <WiStrongWind size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Wind</small>
                                            <div className="h6 mb-0 font-weight-bold">{wind_speed} {unit === 'metric' ? 'km/h' : 'mph'} <small>{wind_dir}</small></div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <WiBarometer size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Pressure</small>
                                            <div className="h6 mb-0 font-weight-bold">{pressure} hPa</div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <WiDaySunny size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">UV Index</small>
                                            <div className="h6 mb-0 font-weight-bold">{uv_index}</div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4} className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <MdVisibility size={26} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Visibility</small>
                                            <div className="h6 mb-0 font-weight-bold">{visibility} km</div>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={6} md={4}>
                                    <div className="d-flex align-items-center">
                                        <WiCloud size={30} className="mr-2" />
                                        <div>
                                            <small className="opacity-75">Cloud Cover</small>
                                            <div className="h6 mb-0 font-weight-bold">{cloudcover}%</div>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default CurrentWeather;
