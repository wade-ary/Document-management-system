"""
MongoDB and GridFS connection for the document management system.
"""
import os
from pymongo import MongoClient
import gridfs

_MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
_client = None
_dbs = {}
_fs_cache = {}


def _get_client():
    global _client
    if _client is None:
        _client = MongoClient(_MONGO_URI)
    return _client


def get_db(name: str):
    """Get a MongoDB database by name."""
    global _dbs
    if name not in _dbs:
        _dbs[name] = _get_client()[name]
    return _dbs[name]


def get_fs(db_name: str):
    """Get GridFS instance for the given database."""
    global _fs_cache
    if db_name not in _fs_cache:
        db = get_db(db_name)
        _fs_cache[db_name] = gridfs.GridFS(db)
    return _fs_cache[db_name]


class MongoDB:
    """MongoDB helper used by app.py."""
    @staticmethod
    def get_db(name: str):
        return get_db(name)

    @staticmethod
    def get_fs(name: str):
        return get_fs(name)
