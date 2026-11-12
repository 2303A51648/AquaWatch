-- ====================================================================
-- AquaWatch: Water Quality Monitoring & Alert Management Schema
-- Database: PostgreSQL 16+
-- ====================================================================

-- 1. Create custom ENUM types
CREATE TYPE user_role AS ENUM ('Administrator', 'Monitoring Operator', 'Viewer');
CREATE TYPE water_source_type AS ENUM ('River', 'Reservoir', 'Lake', 'Treatment Plant', 'Estuary', 'Aquifer');
CREATE TYPE quality_status AS ENUM ('Normal', 'Warning', 'Critical');
CREATE TYPE alert_severity AS ENUM ('Critical', 'Warning', 'Informational');
CREATE TYPE alert_status AS ENUM ('Active', 'Acknowledged', 'Resolved');
CREATE TYPE sensor_status AS ENUM ('Active', 'Calibrating', 'Maintenance', 'Inactive');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Viewer',
    department VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 3. Monitoring Stations Table
CREATE TABLE IF NOT EXISTS monitoring_stations (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    water_source_type water_source_type NOT NULL,
    capacity_mgd NUMERIC(8, 2) DEFAULT 10.0,
    status quality_status DEFAULT 'Normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_status ON monitoring_stations(status);
CREATE INDEX idx_stations_source ON monitoring_stations(water_source_type);

-- 4. Sensors Table
CREATE TABLE IF NOT EXISTS sensors (
    id VARCHAR(64) PRIMARY KEY,
    station_id VARCHAR(64) REFERENCES monitoring_stations(id) ON DELETE CASCADE,
    parameter_key VARCHAR(32) NOT NULL,
    parameter_name VARCHAR(128) NOT NULL,
    serial_number VARCHAR(64) UNIQUE NOT NULL,
    model VARCHAR(128) NOT NULL,
    status sensor_status NOT NULL DEFAULT 'Active',
    battery_percent INT DEFAULT 100 CHECK (battery_percent BETWEEN 0 AND 100),
    signal_rssi INT DEFAULT -60,
    firmware_version VARCHAR(32) DEFAULT 'v1.0.0',
    last_calibrated_at DATE NOT NULL,
    last_communication_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sensors_station_id ON sensors(station_id);
CREATE INDEX idx_sensors_status ON sensors(status);

-- 5. Water Quality Thresholds Table
CREATE TABLE IF NOT EXISTS water_quality_thresholds (
    id SERIAL PRIMARY KEY,
    standard_name VARCHAR(64) NOT NULL DEFAULT 'EPA Clean Water Act',
    parameter_key VARCHAR(32) NOT NULL UNIQUE,
    parameter_name VARCHAR(64) NOT NULL,
    unit VARCHAR(16) NOT NULL,
    min_normal NUMERIC(8, 2) NOT NULL,
    max_normal NUMERIC(8, 2) NOT NULL,
    min_warning NUMERIC(8, 2) NOT NULL,
    max_warning NUMERIC(8, 2) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Water Quality Readings Table (Time-Series Partition Ready)
CREATE TABLE IF NOT EXISTS water_quality_readings (
    id VARCHAR(64) PRIMARY KEY,
    station_id VARCHAR(64) REFERENCES monitoring_stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ph NUMERIC(5, 2) NOT NULL,
    turbidity NUMERIC(6, 2) NOT NULL,
    dissolved_oxygen NUMERIC(5, 2) NOT NULL,
    temperature NUMERIC(5, 2) NOT NULL,
    tds NUMERIC(7, 2) NOT NULL,
    conductivity NUMERIC(7, 2) NOT NULL,
    wqi_score INT NOT NULL,
    status quality_status NOT NULL,
    is_simulated BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_readings_station_time ON water_quality_readings(station_id, timestamp DESC);
CREATE INDEX idx_readings_timestamp ON water_quality_readings(timestamp DESC);

-- 7. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    station_id VARCHAR(64) REFERENCES monitoring_stations(id) ON DELETE CASCADE,
    parameter_key VARCHAR(32) NOT NULL,
    parameter_name VARCHAR(64) NOT NULL,
    observed_value NUMERIC(8, 2) NOT NULL,
    unit VARCHAR(16) NOT NULL,
    expected_range VARCHAR(64) NOT NULL,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'Active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    dedup_key VARCHAR(128) NOT NULL,
    occurrence_count INT DEFAULT 1,
    acknowledged_by VARCHAR(128),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(128),
    resolved_at TIMESTAMP WITH TIME ZONE,
    root_cause VARCHAR(255),
    resolution_notes TEXT
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_dedup ON alerts(dedup_key);

-- 8. Alert History / Audit Log
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(64) REFERENCES alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id),
    action VARCHAR(32) NOT NULL,
    root_cause VARCHAR(255),
    resolution_notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Initial Seed Data
INSERT INTO users (id, name, email, password_hash, role, department)
VALUES
    ('USR-01', 'Dr. Sarah Chen', 'sarah.chen@aquawatch.io', '$2b$12$e80yV...', 'Administrator', 'Environmental Safety & Water Directorate'),
    ('USR-02', 'Marcus Vance', 'marcus.v@aquawatch.io', '$2b$12$k21mP...', 'Monitoring Operator', 'Field Operations & Sensor Calibration'),
    ('USR-03', 'Elena Rostova', 'elena.r@aquawatch.io', '$2b$12$q78xT...', 'Viewer', 'Regional Compliance & Public Affairs')
ON CONFLICT (id) DO NOTHING;

INSERT INTO monitoring_stations (id, code, name, location, latitude, longitude, water_source_type, capacity_mgd, status)
VALUES
    ('STN-01', 'HLD-RES-01', 'Highland Reservoir Intake', 'North Ridge Valley, Elevation 640m', 37.7833, -122.4167, 'Reservoir', 45.0, 'Normal'),
    ('STN-02', 'CLR-CRK-02', 'Clear Creek Upstream Monitoring', 'Bear Mountain Tributary, Mile 14', 37.8012, -122.4011, 'River', 22.5, 'Normal'),
    ('STN-03', 'IND-CNF-03', 'Industrial Basin Confluence Point', 'Lower River Delta, Pier 22', 37.7562, -122.3884, 'River', 18.0, 'Warning'),
    ('STN-04', 'MTR-WTP-04', 'Metro Filtration Plant #4 Outflow', 'Central Utility District, Bay 3', 37.7421, -122.4342, 'Treatment Plant', 80.0, 'Normal'),
    ('STN-05', 'BLU-LKE-05', 'Blue Lake Recreational Outpost', 'Pine Point Sanctuary, Shoreline A', 37.7289, -122.4789, 'Lake', 12.0, 'Normal'),
    ('STN-06', 'EST-DLT-06', 'Coastal Estuary Tidal Interface', 'Ocean Inlet Marshland, Sensor Pod 8', 37.7104, -122.5012, 'Estuary', 30.0, 'Critical')
ON CONFLICT (id) DO NOTHING;
