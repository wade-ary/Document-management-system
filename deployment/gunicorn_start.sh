#!/bin/bash
NAME="transformo_app"
APPDIR=/var/www/transformo
SOCKFILE=/var/www/transformo/gunicorn.sock
USER=ubuntu
GROUP=ubuntu
NUM_WORKERS=3
FLASK_APP=app:app
TIMEOUT=120

echo "Starting $NAME as `whoami`"

# Activate the Poetry virtual environment
cd $APPDIR

# Try to get the Poetry virtual environment path
if command -v poetry >/dev/null 2>&1; then
    # Get Poetry virtual environment path
    POETRY_VENV_PATH=$(poetry env info --path 2>/dev/null)
    if [ -n "$POETRY_VENV_PATH" ] && [ -d "$POETRY_VENV_PATH" ]; then
        echo "Using Poetry virtual environment: $POETRY_VENV_PATH"
        source "$POETRY_VENV_PATH/bin/activate"
    elif [ -d ".venv" ]; then
        echo "Using in-project virtual environment: .venv"
        source .venv/bin/activate
    else
        echo "No virtual environment found, trying to run without activation"
    fi
else
    # Fallback to .venv if Poetry is not available
    if [ -d ".venv" ]; then
        echo "Using in-project virtual environment: .venv"
        source .venv/bin/activate
    else
        echo "No virtual environment found"
    fi
fi

export PYTHONPATH=$APPDIR:$PYTHONPATH

# Create the run directory if it doesn't exist
RUNDIR=$(dirname $SOCKFILE)
test -d $RUNDIR || mkdir -p $RUNDIR

# Start your Flask app with Gunicorn
# Programs meant to be run under supervisor should not daemonize themselves (do not use --daemon)
exec gunicorn ${FLASK_APP} \
  --name $NAME \
  --workers $NUM_WORKERS \
  --timeout $TIMEOUT \
  --user=$USER --group=$GROUP \
  --bind=unix:$SOCKFILE \
  --log-level=debug \
  --log-file=-
