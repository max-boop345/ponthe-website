#!/bin/sh

echo "Check if PostgreSQL started..."
while ! nc -z $DB_HOST $DB_PORT; do
    sleep 0.1
done
echo "PostgreSQL started"

echo "Migrating..."
python3 manage.py migrate --noinput

echo "Starting gunicorn server..."

exec "$@"