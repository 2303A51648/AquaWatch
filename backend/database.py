import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DATABASE_NAME = os.getenv("MONGODB_DATABASE_NAME", "aquawatch_db")

mongo_client: MongoClient | None = None
mongo_database: Database | None = None


def connect_mongo() -> Database:
    global mongo_client, mongo_database

    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is required to start the backend.")

    if mongo_client is None:
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        mongo_database = mongo_client[MONGODB_DATABASE_NAME]

    client = mongo_client
    if client is None:
        raise RuntimeError("MongoDB client is not initialized.")
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        close_mongo_client()
        raise RuntimeError("Unable to connect to MongoDB.") from exc

    database = mongo_database
    if database is None:
        raise RuntimeError("MongoDB database is not initialized.")
    return database


def close_mongo_client() -> None:
    global mongo_client, mongo_database

    client = mongo_client
    mongo_client = None
    mongo_database = None
    if client is not None:
        client.close()


def get_mongo_db() -> Database:
    if mongo_database is None:
        raise RuntimeError("MongoDB has not been initialized.")
    return mongo_database


def get_db() -> Database:
    return get_mongo_db()


def ensure_mongo_indexes(db: Database | None = None) -> None:
    database = db if db is not None else get_mongo_db()

    database["users"].create_index("id", unique=True)
    database["users"].create_index("email", unique=True)

    database["stations"].create_index("id", unique=True)
    database["stations"].create_index("code", unique=True)
    database["stations"].create_index([("created_at", DESCENDING)])

    database["sensors"].create_index("id", unique=True)
    database["sensors"].create_index("serial_number", unique=True)
    database["sensors"].create_index("station_id")
    database["sensors"].create_index([("last_communication_at", DESCENDING)])

    database["readings"].create_index("id", unique=True)
    database["readings"].create_index(
        [("station_id", ASCENDING), ("timestamp", DESCENDING)]
    )
    database["readings"].create_index([("timestamp", DESCENDING)])

    database["alerts"].create_index("id", unique=True)
    database["alerts"].create_index(
        [("station_id", ASCENDING), ("timestamp", DESCENDING)]
    )
    database["alerts"].create_index("status")
    database["alerts"].create_index("severity")
    database["alerts"].create_index([("timestamp", DESCENDING)])
    database["alerts"].create_index("dedup_key")

    database["notifications"].create_index("id", unique=True)
