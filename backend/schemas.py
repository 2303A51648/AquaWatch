from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class StationBase(BaseModel):
    name: str
    code: str
    location: str
    water_source_type: str
    capacity_mgd: float = 10.0
    latitude: float
    longitude: float

class StationCreate(StationBase):
    pass

class StationResponse(StationBase):
    id: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SensorBase(BaseModel):
    station_id: str
    parameter_key: str
    parameter_name: str
    model: str
    serial_number: str

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: str
    status: str
    battery_percent: int
    signal_rssi: int
    last_calibrated_at: str
    last_communication_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReadingResponse(BaseModel):
    id: str
    station_id: str
    timestamp: datetime
    ph: float
    turbidity: float
    dissolved_oxygen: float
    temperature: float
    tds: float
    conductivity: float
    wqi_score: int
    status: str
    is_simulated: bool = True

    class Config:
        from_attributes = True

class AlertAcknowledgeRequest(BaseModel):
    user_name: str

class AlertResolveRequest(BaseModel):
    user_name: str
    root_cause: str
    resolution_notes: str

class AlertResponse(BaseModel):
    id: str
    station_id: str
    parameter_key: str
    parameter_name: str
    observed_value: float
    unit: str
    expected_range: str
    severity: str
    status: str
    timestamp: datetime
    description: str
    occurrence_count: int
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True
