#!/usr/bin/env python3
"""
Fast development startup script for Flask app
Skips heavy model loading for faster iteration
"""
import os
import sys

# Set development mode
os.environ["DEVELOPMENT_MODE"] = "true"
os.environ["FLASK_ENV"] = "development"
os.environ["FLASK_DEBUG"] = "1"

print("🚀 Starting Flask app in FAST development mode...")
print("📝 Heavy AI models will be loaded only when needed")

# Import and run the app
if __name__ == "__main__":
    from app import app
    app.run(
        host="0.0.0.0",
        port=7138,
        debug=True,
        use_reloader=True,
        threaded=True
    )
