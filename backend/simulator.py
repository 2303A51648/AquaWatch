import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from pymongo.errors import PyMongoError

from backend.database import get_mongo_db

logger = logging.getLogger(__name__)

class WaterSensorSimulator:
    def __init__(self, database_provider=get_mongo_db):
        self.database_provider = database_provider
        self.is_running = True
        self.is_enabled = True
        self.interval_seconds = 4
        self.active_anomaly = None

    def calculate_wqi(self, ph: float, turbidity: float, do_val: float, temp: float, tds: float, ec: float) -> int:
        score = 100
        # Deduct for pH dev from 7.0
        score -= min(30, abs(ph - 7.0) * 15)
        # Deduct for low DO
        if do_val < 6.5:
            score -= min(40, (6.5 - do_val) * 12)
        # Deduct for high turbidity
        if turbidity > 5.0:
            score -= min(30, (turbidity - 5.0) * 4)
        return max(15, min(100, int(score)))

    async def simulation_loop(self):
        while self.is_running:
            try:
                if self.is_enabled:
                    self.run_once()
            except PyMongoError:
                logger.exception("Simulator MongoDB operation failed.")

            await asyncio.sleep(self.interval_seconds)

    def inject_anomaly(self, station_id: str, anomaly_type: str):
        anomaly_config = {
            "acid_spill": ("ph", "ph", 4.1, "Critical", "pH", "pH", "6.5 - 8.5"),
            "turbidity_storm": ("turbidity", "turbidity", 24.5, "Critical", "Turbidity", "NTU", "0 - 5 NTU"),
            "hypoxia_drop": ("dissolved_oxygen", "dissolvedOxygen", 2.4, "Critical", "Dissolved Oxygen", "mg/L", "6.5 - 14 mg/L"),
            "saline_surge": ("tds", "tds", 920.0, "Warning", "Total Dissolved Solids", "mg/L", "50 - 500 mg/L"),
        }
        config = anomaly_config.get(anomaly_type)
        if config is None:
            raise ValueError("Unsupported anomaly type.")

        db = self.database_provider()
        station = db["stations"].find_one(
            {"id": station_id},
            projection={"_id": False},
        )
        if station is None:
            raise LookupError("Station not found.")

        field, parameter_key, target, severity, parameter_name, unit, expected_range = config
        self.active_anomaly = {
            "station_id": station_id,
            "field": field,
            "parameter_key": parameter_key,
            "target": target,
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=45),
            "severity": severity,
            "parameter_name": parameter_name,
            "unit": unit,
            "expected_range": expected_range,
            "station_name": station.get("name", station_id),
        }
        self.run_once()
        return {
            "stationId": station_id,
            "anomalyType": anomaly_type,
            "parameterKey": parameter_key,
            "targetValue": target,
        }

    def reset(self):
        self.active_anomaly = None

    def run_once(self):
        db = self.database_provider()
        anomaly = self.active_anomaly
        if anomaly and anomaly["expires_at"] <= datetime.now(timezone.utc):
            self.active_anomaly = None
            anomaly = None

        with db.client.start_session() as session:
            with session.start_transaction():
                stations = db["stations"].find({}, {"_id": False}, session=session)

                for station in stations:
                    ph = round(random.gauss(7.3, 0.2), 2)
                    turbidity = round(max(0.2, random.gauss(2.2, 0.8)), 2)
                    do_val = round(max(2.0, random.gauss(8.4, 0.5)), 2)
                    temp = round(random.gauss(18.0, 1.2), 1)
                    tds = round(max(50, random.gauss(180, 25)), 1)
                    ec = round(max(100, random.gauss(320, 35)), 1)

                    if anomaly and anomaly["station_id"] == station["id"]:
                        if anomaly["field"] == "ph":
                            ph = anomaly["target"]
                        elif anomaly["field"] == "turbidity":
                            turbidity = anomaly["target"]
                        elif anomaly["field"] == "dissolved_oxygen":
                            do_val = anomaly["target"]
                        elif anomaly["field"] == "tds":
                            tds = anomaly["target"]

                    wqi = self.calculate_wqi(ph, turbidity, do_val, temp, tds, ec)
                    status = "Normal"
                    if wqi < 50 or ph < 6.0 or ph > 9.0 or turbidity > 10.0 or do_val < 4.5:
                        status = "Critical"
                    elif wqi < 70 or ph < 6.5 or ph > 8.5 or turbidity > 5.0 or do_val < 6.5:
                        status = "Warning"

                    timestamp = datetime.now(timezone.utc)
                    db["readings"].insert_one({
                        "id": f"RDG-{station['id']}-{uuid4().hex[:12].upper()}",
                        "station_id": station["id"],
                        "timestamp": timestamp,
                        "ph": ph,
                        "turbidity": turbidity,
                        "dissolved_oxygen": do_val,
                        "temperature": temp,
                        "tds": tds,
                        "conductivity": ec,
                        "wqi_score": wqi,
                        "status": status,
                        "is_simulated": True,
                    }, session=session)
                    db["stations"].update_one(
                        {"id": station["id"]},
                        {"$set": {"status": status}},
                        session=session,
                    )
                    if anomaly and anomaly["station_id"] == station["id"]:
                        db["alerts"].insert_one({
                            "id": f"ALT-{uuid4().hex[:12].upper()}",
                            "station_id": station["id"],
                            "parameter_key": anomaly["parameter_key"],
                            "parameter_name": anomaly["parameter_name"],
                            "observed_value": anomaly["target"],
                            "unit": anomaly["unit"],
                            "expected_range": anomaly["expected_range"],
                            "severity": anomaly["severity"],
                            "status": "Active",
                            "timestamp": timestamp,
                            "description": f"Simulated {anomaly['parameter_name']} anomaly at {station.get('name', station['id'])}.",
                            "dedup_key": f"{station['id']}:{anomaly['parameter_key']}:{anomaly['severity']}",
                            "occurrence_count": 1,
                        }, session=session)
