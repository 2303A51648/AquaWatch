from backend.database import close_mongo_client, connect_mongo, ensure_mongo_indexes


def init_collections():
    db = connect_mongo()
    ensure_mongo_indexes(db)


if __name__ == "__main__":
    try:
        init_collections()
        print("MongoDB collections and indexes initialized successfully.")
    finally:
        close_mongo_client()
