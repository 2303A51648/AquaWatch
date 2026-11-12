
import asyncio
import csv
import io
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import PyMongoError

from backend.database import (
    close_mongo_client,
    connect_mongo,
    ensure_mongo_indexes,
    get_db,
)

from backend.simulator import WaterSensorSimulator

from backend.schemas import (
    AlertAcknowledgeRequest,
    AlertResolveRequest,
    AlertResponse,
    ReadingResponse,
    SensorCreate,
    SensorResponse,
    StationCreate,
    StationResponse,
)


# ==========================================
# APPLICATION LIFESPAN
# ==========================================

@asynccontextmanager
async def lifespan(_: FastAPI):
    simulator = None
    simulation_task = None

    try:
        # Connect to MongoDB
        mongo_db = connect_mongo()

        # Initialize MongoDB indexes
        ensure_mongo_indexes(mongo_db)
        simulator = WaterSensorSimulator(lambda: mongo_db)
        app.state.simulator = simulator

        # Start water quality simulator
        simulation_task = asyncio.create_task(
            simulator.simulation_loop()
        )

        yield

    finally:
        # Stop simulator safely
        if simulator is not None:
            simulator.is_running = False

        if simulation_task:
            simulation_task.cancel()

            try:
                await simulation_task
            except asyncio.CancelledError:
                pass

        # Close MongoDB connection
        close_mongo_client()
        app.state.simulator = None


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="AquaWatch Water Quality Monitoring & Alert API",
    description="Production-grade RESTful API for water quality monitoring, IoT telemetry ingestion, and alert management.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DEFAULT_THRESHOLDS = {
    "ph": {"minNormal": 6.5, "maxNormal": 8.5, "minWarning": 6.0, "maxWarning": 9.0, "unit": "pH", "name": "pH Level", "description": "Acidity or alkalinity measure"},
    "turbidity": {"minNormal": 0.0, "maxNormal": 5.0, "minWarning": 0.0, "maxWarning": 10.0, "unit": "NTU", "name": "Turbidity", "description": "Cloudiness / particulate concentration"},
    "dissolvedOxygen": {"minNormal": 6.5, "maxNormal": 14.0, "minWarning": 4.5, "maxWarning": 15.0, "unit": "mg/L", "name": "Dissolved Oxygen", "description": "Free oxygen in water"},
    "temperature": {"minNormal": 10.0, "maxNormal": 24.0, "minWarning": 6.0, "maxWarning": 28.0, "unit": "°C", "name": "Temperature", "description": "Water temperature"},
    "tds": {"minNormal": 50.0, "maxNormal": 500.0, "minWarning": 20.0, "maxWarning": 800.0, "unit": "mg/L", "name": "Total Dissolved Solids", "description": "Dissolved inorganic and organic substances"},
    "conductivity": {"minNormal": 100.0, "maxNormal": 800.0, "minWarning": 50.0, "maxWarning": 1200.0, "unit": "µS/cm", "name": "Electrical Conductivity", "description": "Ionic salinity and mineral transport capacity"},
}


# ==========================================
# MONGODB DOCUMENT NORMALIZATION
# ==========================================

def _normalize_mongo_document(doc):
    if doc is None:
        return {}

    normalized = dict(doc)
    normalized.pop("_id", None)

    for field_name in [
        "created_at",
        "timestamp",
        "last_communication_at",
        "acknowledged_at",
        "resolved_at",
    ]:
        value = normalized.get(field_name)

        if isinstance(value, str):
            try:
                normalized[field_name] = datetime.fromisoformat(
                    value.replace("Z", "+00:00")
                )
            except ValueError:
                pass

    return normalized


# ==========================================
# HEALTH AND READINESS ENDPOINTS
# ==========================================

@app.get("/health", tags=["DevOps & Probes"])
def health_probe():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "aquawatch-fastapi-backend",
        "version": "1.0.0",
        "database": "mongodb",
    }


@app.get("/ready", tags=["DevOps & Probes"])
def readiness_probe(db: Database = Depends(get_db)):
    try:
        db.command("ping")
        station_count = db["stations"].count_documents({})

        return {
            "status": "ready",
            "database": "connected (MongoDB)",
            "stations_configured": station_count,
        }

    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unreachable",
        ) from exc


# ==========================================
# MONITORING STATIONS
# ==========================================

@app.get(
    "/api/stations",
    response_model=List[StationResponse],
    tags=["Monitoring Stations"],
)
def get_stations(db: Database = Depends(get_db)):
    docs = db["stations"].find(
        {},
        {"_id": False}
    ).sort("created_at", -1)

    return [
        StationResponse.model_validate(
            _normalize_mongo_document(doc)
        )
        for doc in docs
    ]


@app.post(
    "/api/stations",
    response_model=StationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Monitoring Stations"],
)
def create_station(
    station: StationCreate,
    db: Database = Depends(get_db),
):
    payload = station.model_dump()
    payload["status"] = "Normal"
    payload["created_at"] = datetime.now(timezone.utc)
    payload["id"] = f"STN-{int(datetime.now().timestamp() * 1000)}"

    db["stations"].insert_one(payload)

    return StationResponse.model_validate(
        _normalize_mongo_document(payload)
    )


# ==========================================
# SENSORS
# ==========================================

@app.get(
    "/api/sensors",
    response_model=List[SensorResponse],
    tags=["Sensors"],
)
def get_sensors(
    station_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Database = Depends(get_db),
):
    query = {}

    if station_id:
        query["station_id"] = station_id

    if status:
        query["status"] = status

    docs = db["sensors"].find(
        query,
        {"_id": False}
    ).sort("last_communication_at", -1)

    return [
        SensorResponse.model_validate(
            _normalize_mongo_document(doc)
        )
        for doc in docs
    ]


@app.post(
    "/api/sensors",
    response_model=SensorResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sensors"],
)
def create_sensor(
    sensor: SensorCreate,
    db: Database = Depends(get_db),
):
    payload = sensor.model_dump()

    payload["id"] = f"SNS-{int(datetime.now().timestamp() * 1000)}"
    payload["status"] = "Active"
    payload["battery_percent"] = 100
    payload["signal_rssi"] = -60
    payload["last_calibrated_at"] = datetime.now(
        timezone.utc
    ).strftime("%Y-%m-%d")
    payload["last_communication_at"] = datetime.now(timezone.utc)

    db["sensors"].insert_one(payload)

    return SensorResponse.model_validate(
        _normalize_mongo_document(payload)
    )


@app.put("/api/sensors/{sensor_id}", tags=["Sensors"])
def update_sensor_status(
    sensor_id: str,
    payload: dict,
    db: Database = Depends(get_db),
):
    new_status = payload.get("status")
    if not isinstance(new_status, str) or not new_status:
        raise HTTPException(status_code=422, detail="A sensor status is required.")

    sensor = db["sensors"].find_one_and_update(
        {"id": sensor_id},
        {"$set": {"status": new_status}},
        return_document=ReturnDocument.AFTER,
        projection={"_id": False},
    )
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return _normalize_mongo_document(sensor)


# ==========================================
# WATER QUALITY READINGS
# ==========================================

@app.get(
    "/api/readings/latest",
    response_model=List[ReadingResponse],
    tags=["Readings"],
)
def get_latest_readings(db: Database = Depends(get_db)):
    stations = db["stations"].find({}, {"_id": False})

    results = []

    for station in stations:
        latest = db["readings"].find_one(
            {"station_id": station["id"]},
            sort=[("timestamp", -1)],
            projection={"_id": False},
        )

        if latest:
            results.append(
                ReadingResponse.model_validate(
                    _normalize_mongo_document(latest)
                )
            )

    return results


@app.get(
    "/api/readings/history",
    response_model=List[ReadingResponse],
    tags=["Readings"],
)
def get_readings_history(
    station_id: Optional[str] = None,
    limit: int = Query(50, le=500),
    db: Database = Depends(get_db),
):
    query = {}

    if station_id:
        query["station_id"] = station_id

    docs = db["readings"].find(
        query,
        {"_id": False}
    ).sort("timestamp", -1).limit(limit)

    return [
        ReadingResponse.model_validate(
            _normalize_mongo_document(doc)
        )
        for doc in docs
    ]


# ==========================================
# ALERT MANAGEMENT
# ==========================================

@app.get(
    "/api/alerts",
    response_model=List[AlertResponse],
    tags=["Alert Management"],
)
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Database = Depends(get_db),
):
    query = {}

    if status and status != "all":
        query["status"] = status

    if severity and severity != "all":
        query["severity"] = severity

    docs = db["alerts"].find(
        query,
        {"_id": False}
    ).sort("timestamp", -1)

    return [
        AlertResponse.model_validate(
            _normalize_mongo_document(doc)
        )
        for doc in docs
    ]


@app.post(
    "/api/alerts/{alert_id}/acknowledge",
    response_model=AlertResponse,
    tags=["Alert Management"],
)
def acknowledge_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    db: Database = Depends(get_db),
):
    alert = db["alerts"].find_one_and_update(
        {"id": alert_id},
        {
            "$set": {
                "status": "Acknowledged",
                "acknowledged_by": payload.user_name,
                "acknowledged_at": datetime.now(timezone.utc),
            }
        },
        return_document=ReturnDocument.AFTER,
        projection={"_id": False},
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found",
        )

    return AlertResponse.model_validate(
        _normalize_mongo_document(alert)
    )


@app.post(
    "/api/alerts/{alert_id}/resolve",
    response_model=AlertResponse,
    tags=["Alert Management"],
)
def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest,
    db: Database = Depends(get_db),
):
    alert = db["alerts"].find_one_and_update(
        {"id": alert_id},
        {
            "$set": {
                "status": "Resolved",
                "resolved_by": payload.user_name,
                "resolved_at": datetime.now(timezone.utc),
                "root_cause": payload.root_cause,
                "resolution_notes": payload.resolution_notes,
            }
        },
        return_document=ReturnDocument.AFTER,
        projection={"_id": False},
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found",
        )

    return AlertResponse.model_validate(
        _normalize_mongo_document(alert)
    )


@app.get("/api/thresholds", tags=["Thresholds"])
def get_thresholds(db: Database = Depends(get_db)):
    settings = db["settings"].find_one({"_id": "water_quality_thresholds"})
    return settings["value"] if settings else DEFAULT_THRESHOLDS


@app.put("/api/thresholds", tags=["Thresholds"])
def update_thresholds(payload: dict, db: Database = Depends(get_db)):
    settings = db["settings"].find_one({"_id": "water_quality_thresholds"})
    updated = {
        **DEFAULT_THRESHOLDS,
        **(settings.get("value", {}) if settings else {}),
        **payload,
    }
    db["settings"].update_one(
        {"_id": "water_quality_thresholds"},
        {"$set": {"value": updated}},
        upsert=True,
    )
    return updated


@app.post("/api/simulation/toggle", tags=["Simulation"])
def toggle_simulator(request: Request):
    simulator = getattr(request.app.state, "simulator", None)
    if simulator is None:
        raise HTTPException(status_code=503, detail="Simulator is not running.")
    simulator.is_enabled = not simulator.is_enabled
    return {"is_running": simulator.is_enabled}


@app.post("/api/simulation/inject-anomaly", tags=["Simulation"])
def inject_anomaly(payload: dict, request: Request):
    simulator = getattr(request.app.state, "simulator", None)
    if simulator is None:
        raise HTTPException(status_code=503, detail="Simulator is not running.")
    try:
        anomaly = simulator.inject_anomaly(
            str(payload.get("station_id", "")),
            str(payload.get("anomaly_type", "")),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"message": "Simulation anomaly injected.", "anomaly": anomaly}


@app.post("/api/simulation/reset", tags=["Simulation"])
def reset_simulation(request: Request, db: Database = Depends(get_db)):
    simulator = getattr(request.app.state, "simulator", None)
    if simulator is None:
        raise HTTPException(status_code=503, detail="Simulator is not running.")
    simulator.reset()
    db["settings"].update_one(
        {"_id": "water_quality_thresholds"},
        {"$set": {"value": DEFAULT_THRESHOLDS}},
        upsert=True,
    )
    return {"message": "Simulator reset; stored readings and alerts were preserved."}


@app.get("/api/reports/summary", tags=["Reports"])
def get_report_summary(db: Database = Depends(get_db)):
    readings = db["readings"]
    total = readings.count_documents({})
    normal = readings.count_documents({"status": "Normal"})
    warning = readings.count_documents({"status": "Warning"})
    critical = readings.count_documents({"status": "Critical"})
    alerts = db["alerts"]
    total_alerts = alerts.count_documents({})
    active_alerts = alerts.count_documents({"status": "Active"})
    stations_count = db["stations"].count_documents({})
    compliance = ((normal + warning * 0.7) / total * 100) if total else 100.0
    return {
        "totalReadings": total,
        "normalCount": normal,
        "warningCount": warning,
        "criticalCount": critical,
        "complianceRate": round(compliance, 1),
        "totalAlerts": total_alerts,
        "activeAlertsCount": active_alerts,
        "stationsMonitored": stations_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/reports/export-csv", tags=["Reports"])
def export_readings_csv(db: Database = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reading_ID", "Station_ID", "Station_Name", "Timestamp_UTC", "pH",
        "Turbidity_NTU", "Dissolved_Oxygen_mgL", "Temperature_C", "TDS_mgL",
        "Conductivity_uScm", "WQI_Score", "Overall_Status", "Data_Type",
    ])
    stations = {
        station["id"]: station.get("name", "")
        for station in db["stations"].find({}, {"_id": False})
    }
    readings = db["readings"].find({}, {"_id": False}).sort("timestamp", -1)
    for reading in readings:
        writer.writerow([
            reading.get("id", ""),
            reading.get("station_id", ""),
            stations.get(reading.get("station_id"), ""),
            reading.get("timestamp", ""),
            reading.get("ph", ""),
            reading.get("turbidity", ""),
            reading.get("dissolved_oxygen", ""),
            reading.get("temperature", ""),
            reading.get("tds", ""),
            reading.get("conductivity", ""),
            reading.get("wqi_score", ""),
            reading.get("status", ""),
            "SIMULATED_TELEMETRY" if reading.get("is_simulated", True) else "TELEMETRY",
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="aquawatch_water_quality_telemetry.csv"'},
    )
