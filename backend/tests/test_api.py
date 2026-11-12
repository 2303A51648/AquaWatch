from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError

import backend.database as database
import backend.main as api
from backend.database import get_db
from backend.simulator import WaterSensorSimulator


class FakeCursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, key_or_list, direction=None):
        keys = key_or_list if isinstance(key_or_list, list) else [(key_or_list, direction)]
        for key, sort_direction in reversed(keys):
            self.documents.sort(
                key=lambda document: document.get(key),
                reverse=sort_direction < 0,
            )
        return self

    def limit(self, count):
        self.documents = self.documents[:count]
        return self

    def __iter__(self):
        return iter(deepcopy(self.documents))


class FakeCollection:
    def __init__(self):
        self.documents = []
        self.indexes = []

    @staticmethod
    def _matches(document, query):
        return all(document.get(key) == value for key, value in (query or {}).items())

    @staticmethod
    def _project(document, projection):
        result = deepcopy(document)
        if projection and projection.get("_id") is False:
            result.pop("_id", None)
        return result

    def create_index(self, keys, **options):
        self.indexes.append((keys, options))

    def insert_one(self, document, session=None):
        self.documents.append(deepcopy(document))

    def find(self, query=None, projection=None, session=None):
        documents = [
            self._project(document, projection)
            for document in self.documents
            if self._matches(document, query)
        ]
        return FakeCursor(documents)

    def find_one(self, query=None, sort=None, projection=None):
        cursor = self.find(query, projection)
        if sort:
            cursor.sort(sort)
        return next(iter(cursor), None)

    def count_documents(self, query):
        return sum(self._matches(document, query) for document in self.documents)

    def update_one(self, query, update, session=None, upsert=False):
        for document in self.documents:
            if self._matches(document, query):
                document.update(deepcopy(update.get("$set", {})))
                return
        if upsert:
            document = deepcopy(query)
            document.update(deepcopy(update.get("$set", {})))
            self.documents.append(document)

    def find_one_and_update(self, query, update, return_document=None, projection=None):
        for document in self.documents:
            if self._matches(document, query):
                document.update(deepcopy(update.get("$set", {})))
                return self._project(document, projection)
        return None


class FakeSession:
    def __init__(self):
        self.transaction_started = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def start_transaction(self):
        self.transaction_started = True
        return self


class FakeMongoClient:
    def __init__(self):
        self.sessions = []

    def start_session(self):
        session = FakeSession()
        self.sessions.append(session)
        return session


class FakeDatabase:
    def __init__(self):
        self.collections = {}
        self.ping_error = None
        self.client = FakeMongoClient()

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeCollection()
        return self.collections[name]

    def __bool__(self):
        raise AssertionError("Database objects must not be checked for truthiness.")

    def command(self, name):
        if self.ping_error:
            raise self.ping_error
        assert name == "ping"
        return {"ok": 1}


@pytest.fixture
def mongo_db():
    return FakeDatabase()


@pytest.fixture
def api_client(monkeypatch, mongo_db):
    closed = []
    monkeypatch.setattr(api, "connect_mongo", lambda: mongo_db)
    monkeypatch.setattr(api, "ensure_mongo_indexes", lambda db: None)
    monkeypatch.setattr(api, "close_mongo_client", lambda: closed.append(True))
    api.app.dependency_overrides[get_db] = lambda: mongo_db

    with TestClient(api.app) as client:
        yield client, mongo_db

    api.app.dependency_overrides.clear()
    assert closed == [True]


def test_health_and_readiness(api_client):
    client, _ = api_client

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["database"] == "mongodb"

    ready = client.get("/ready")
    assert ready.status_code == 200
    assert ready.json() == {
        "status": "ready",
        "database": "connected (MongoDB)",
        "stations_configured": 0,
    }


def test_local_frontend_cors_preflight(api_client):
    client, _ = api_client

    response = client.options(
        "/api/stations",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_readiness_reports_mongodb_failure(api_client):
    client, mongo_db = api_client
    mongo_db.ping_error = ServerSelectionTimeoutError("unavailable")

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["detail"] == "Database unreachable"


def test_startup_connects_initializes_indexes_and_shutdown_closes(monkeypatch, mongo_db):
    calls = []
    monkeypatch.setattr(api, "connect_mongo", lambda: calls.append("connect") or mongo_db)
    monkeypatch.setattr(
        api,
        "ensure_mongo_indexes",
        lambda db: calls.append(("indexes", db is mongo_db)),
    )
    monkeypatch.setattr(api, "close_mongo_client", lambda: calls.append("close"))

    with TestClient(api.app):
        pass

    assert calls == ["connect", ("indexes", True), "close"]


def test_startup_failure_is_not_swallowed(monkeypatch):
    closed = []

    def fail_connect():
        raise RuntimeError("MongoDB unavailable")

    monkeypatch.setattr(api, "connect_mongo", fail_connect)
    monkeypatch.setattr(api, "close_mongo_client", lambda: closed.append(True))

    with pytest.raises(RuntimeError, match="MongoDB unavailable"):
        with TestClient(api.app):
            pass

    assert closed == [True]


def test_connect_mongo_failure_does_not_fall_back(monkeypatch):
    class FailingClient:
        admin = None

        def __init__(self):
            self.admin = self
            self.closed = False

        def command(self, name):
            raise ServerSelectionTimeoutError("unavailable")

        def close(self):
            self.closed = True

        def __getitem__(self, name):
            return FakeDatabase()

    client = FailingClient()
    monkeypatch.setattr(database, "MONGODB_URI", "mongodb://invalid.test")
    monkeypatch.setattr(database, "MongoClient", lambda *args, **kwargs: client)
    monkeypatch.setattr(database, "mongo_client", None)
    monkeypatch.setattr(database, "mongo_database", None)

    with pytest.raises(RuntimeError, match="Unable to connect to MongoDB"):
        database.connect_mongo()

    assert client.closed
    assert database.mongo_client is None
    assert database.mongo_database is None


def test_station_and_sensor_crud(api_client):
    client, mongo_db = api_client
    station_payload = {
        "name": "Eagle Mountain Reservoir Intake",
        "code": "EMR-01",
        "location": "North Basin Mile 4",
        "water_source_type": "Reservoir",
        "capacity_mgd": 35.0,
        "latitude": 37.7801,
        "longitude": -122.4102,
    }

    created_station = client.post("/api/stations", json=station_payload)
    assert created_station.status_code == 201
    assert created_station.json()["code"] == "EMR-01"
    assert client.get("/api/stations").json()[0]["id"] == created_station.json()["id"]

    sensor_payload = {
        "station_id": created_station.json()["id"],
        "parameter_key": "ph",
        "parameter_name": "pH",
        "model": "AquaSense",
        "serial_number": "SNS-TEST-1",
    }
    created_sensor = client.post("/api/sensors", json=sensor_payload)
    assert created_sensor.status_code == 201
    assert created_sensor.json()["status"] == "Active"

    filtered_sensors = client.get(
        "/api/sensors",
        params={"station_id": sensor_payload["station_id"], "status": "Active"},
    )
    assert filtered_sensors.status_code == 200
    assert [sensor["serial_number"] for sensor in filtered_sensors.json()] == ["SNS-TEST-1"]
    sensor_id = created_sensor.json()["id"]
    updated_sensor = client.put(
        f"/api/sensors/{sensor_id}",
        json={"status": "Calibrating"},
    )
    assert updated_sensor.status_code == 200
    assert updated_sensor.json()["status"] == "Calibrating"


def test_threshold_and_simulation_routes(api_client):
    client, mongo_db = api_client

    defaults = client.get("/api/thresholds")
    assert defaults.status_code == 200
    assert defaults.json()["ph"]["minNormal"] == 6.5

    changed = client.put("/api/thresholds", json={"ph": {**api.DEFAULT_THRESHOLDS["ph"], "minNormal": 6.7}})
    assert changed.status_code == 200
    assert changed.json()["ph"]["minNormal"] == 6.7
    partial_change = client.put("/api/thresholds", json={"turbidity": api.DEFAULT_THRESHOLDS["turbidity"]})
    assert partial_change.status_code == 200
    assert partial_change.json()["ph"]["minNormal"] == 6.7
    assert mongo_db["settings"].find_one({"_id": "water_quality_thresholds"})["value"]["ph"]["minNormal"] == 6.7

    mongo_db["stations"].insert_one({"id": "STN-ANOMALY", "name": "Test Station", "status": "Normal"})
    injected = client.post(
        "/api/simulation/inject-anomaly",
        json={"station_id": "STN-ANOMALY", "anomaly_type": "acid_spill"},
    )
    assert injected.status_code == 200
    assert mongo_db["readings"].count_documents({"station_id": "STN-ANOMALY"}) == 1
    assert mongo_db["alerts"].count_documents({"station_id": "STN-ANOMALY"}) == 1

    toggle = client.post("/api/simulation/toggle")
    assert toggle.status_code == 200
    assert toggle.json()["is_running"] is False

    reset = client.post("/api/simulation/reset")
    assert reset.status_code == 200
    assert "preserved" in reset.json()["message"]
    assert mongo_db["readings"].count_documents({"station_id": "STN-ANOMALY"}) == 1
    assert mongo_db["settings"].find_one({"_id": "water_quality_thresholds"})["value"]["ph"]["minNormal"] == 6.5


def test_report_summary_and_csv(api_client):
    client, mongo_db = api_client
    mongo_db["stations"].insert_one({"id": "STN-REPORT", "name": "Report Station"})
    mongo_db["readings"].insert_one({
        "id": "RDG-REPORT",
        "station_id": "STN-REPORT",
        "timestamp": datetime.now(timezone.utc),
        "status": "Normal",
        "is_simulated": True,
    })

    summary = client.get("/api/reports/summary")
    assert summary.status_code == 200
    assert summary.json()["totalReadings"] == 1
    assert summary.json()["stationsMonitored"] == 1

    csv_response = client.get("/api/reports/export-csv")
    assert csv_response.status_code == 200
    assert "text/csv" in csv_response.headers["content-type"]
    assert "RDG-REPORT" in csv_response.text


def test_reading_latest_and_history_operations(api_client):
    client, mongo_db = api_client
    timestamp = datetime.now(timezone.utc)
    mongo_db["stations"].insert_one({"id": "STN-READING"})
    readings = mongo_db["readings"]
    for reading_id, when, score in [
        ("RDG-OLD", timestamp - timedelta(minutes=1), 80),
        ("RDG-NEW", timestamp, 95),
    ]:
        readings.insert_one({
            "id": reading_id,
            "station_id": "STN-READING",
            "timestamp": when,
            "ph": 7.1,
            "turbidity": 2.0,
            "dissolved_oxygen": 8.0,
            "temperature": 18.0,
            "tds": 180.0,
            "conductivity": 320.0,
            "wqi_score": score,
            "status": "Normal",
            "is_simulated": True,
        })

    latest = client.get("/api/readings/latest")
    assert latest.status_code == 200
    assert [item["id"] for item in latest.json()] == ["RDG-NEW"]

    history = client.get(
        "/api/readings/history",
        params={"station_id": "STN-READING", "limit": 1},
    )
    assert history.status_code == 200
    assert [item["id"] for item in history.json()] == ["RDG-NEW"]


def test_alert_listing_acknowledgment_and_resolution(api_client):
    client, mongo_db = api_client
    mongo_db["alerts"].insert_one({
        "id": "ALT-1",
        "station_id": "STN-1",
        "parameter_key": "ph",
        "parameter_name": "pH",
        "observed_value": 5.2,
        "unit": "pH",
        "expected_range": "6.5-8.5",
        "severity": "Critical",
        "status": "Active",
        "timestamp": datetime.now(timezone.utc),
        "description": "pH is outside the expected range",
        "occurrence_count": 1,
    })

    listing = client.get("/api/alerts", params={"status": "Active", "severity": "Critical"})
    assert listing.status_code == 200
    assert [alert["id"] for alert in listing.json()] == ["ALT-1"]

    acknowledged = client.post(
        "/api/alerts/ALT-1/acknowledge",
        json={"user_name": "Operator"},
    )
    assert acknowledged.status_code == 200
    assert acknowledged.json()["status"] == "Acknowledged"
    assert acknowledged.json()["acknowledged_by"] == "Operator"

    resolved = client.post(
        "/api/alerts/ALT-1/resolve",
        json={
            "user_name": "Operator",
            "root_cause": "Sensor recalibrated",
            "resolution_notes": "Readings returned to normal",
        },
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "Resolved"
    assert resolved.json()["root_cause"] == "Sensor recalibrated"

    missing = client.post(
        "/api/alerts/unknown/acknowledge",
        json={"user_name": "Operator"},
    )
    assert missing.status_code == 404


def test_simulator_inserts_reading_and_updates_station(mongo_db):
    mongo_db["stations"].insert_one({"id": "STN-SIM", "status": "Normal"})
    simulator = WaterSensorSimulator(lambda: mongo_db)

    simulator.run_once()

    readings = list(mongo_db["readings"].find({"station_id": "STN-SIM"}))
    station = mongo_db["stations"].find_one({"id": "STN-SIM"})
    assert len(readings) == 1
    assert readings[0]["is_simulated"] is True
    assert station["status"] == readings[0]["status"]
    assert mongo_db.client.sessions[0].transaction_started


def test_mongodb_indexes_cover_runtime_collections(mongo_db):
    database.ensure_mongo_indexes(mongo_db)

    expected_collections = {"users", "stations", "sensors", "readings", "alerts", "notifications"}
    assert set(mongo_db.collections) == expected_collections
    assert ("email", {"unique": True}) in mongo_db["users"].indexes
    assert ("code", {"unique": True}) in mongo_db["stations"].indexes
    assert ([("last_communication_at", -1)], {}) in mongo_db["sensors"].indexes
    assert ([("station_id", 1), ("timestamp", -1)], {}) in mongo_db["readings"].indexes
    assert ([("timestamp", -1)], {}) in mongo_db["alerts"].indexes
    assert ("id", {"unique": True}) in mongo_db["notifications"].indexes
