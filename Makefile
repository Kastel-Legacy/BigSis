.PHONY: up down build logs shell-db

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

shell-db:
	docker exec -it bigsis_db psql -U bigsis_user -d bigsis

init-db:
	# Placeholder for migration command
	echo "Running migrations..."
	# docker-compose exec backend alembic upgrade head
