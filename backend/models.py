from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="Viewer")
    department = Column(String(128), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class MonitoringStationModel(Base):
    __tablename__ = "monitoring_stations"

    id = Column(String(64), primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    water_source_type = Column(String(32), nullable=False)
    capacity_mgd = Column(Float, default=10.0)
    status = Column(String(32), default="Normal")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sensors = relationship("SensorModel", back_populates="station", cascade="all, delete-orphan")
    readings = relationship("WaterQualityReadingModel", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("AlertModel", back_populates="station", cascade="all, delete-orphan")

class SensorModel(Base):
    __tablename__ = "sensors"

    id = Column(String(64), primary_key=True, index=True)
    station_id = Column(String(64), ForeignKey("monitoring_stations.id"), nullable=False)
    parameter_key = Column(String(32), nullable=False)
    parameter_name = Column(String(128), nullable=False)
    serial_number = Column(String(64), unique=True, nullable=False)
    model = Column(String(128), nullable=False)
    status = Column(String(32), default="Active")
    battery_percent = Column(Integer, default=100)
    signal_rssi = Column(Integer, default=-60)
    firmware_version = Column(String(32), default="v1.0.0")
    last_calibrated_at = Column(String(32), nullable=False)
    last_communication_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    station = relationship("MonitoringStationModel", back_populates="sensors")

class WaterQualityReadingModel(Base):
    __tablename__ = "water_quality_readings"

    id = Column(String(64), primary_key=True, index=True)
    station_id = Column(String(64), ForeignKey("monitoring_stations.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    ph = Column(Float, nullable=False)
    turbidity = Column(Float, nullable=False)
    dissolved_oxygen = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    tds = Column(Float, nullable=False)
    conductivity = Column(Float, nullable=False)
    wqi_score = Column(Integer, nullable=False)
    status = Column(String(32), default="Normal")
    is_simulated = Column(Boolean, default=True)

    station = relationship("MonitoringStationModel", back_populates="readings")

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    station_id = Column(String(64), ForeignKey("monitoring_stations.id"), nullable=False, index=True)
    parameter_key = Column(String(32), nullable=False)
    parameter_name = Column(String(64), nullable=False)
    observed_value = Column(Float, nullable=False)
    unit = Column(String(16), nullable=False)
    expected_range = Column(String(64), nullable=False)
    severity = Column(String(32), nullable=False, index=True)
    status = Column(String(32), default="Active", index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    description = Column(Text, nullable=False)
    dedup_key = Column(String(128), nullable=False, index=True)
    occurrence_count = Column(Integer, default=1)
    acknowledged_by = Column(String(128), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    root_cause = Column(String(255), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    station = relationship("MonitoringStationModel", back_populates="alerts")
