.PHONY: dev db-start db-stop db-reset db-status

# Start local dev (Supabase + auxiliary services)
dev:
	@echo "Starting Supabase..."
	supabase start
	@echo "Starting auxiliary services (Redis, RabbitMQ)..."
	docker compose -f infra/docker-compose.yml up -d
	@echo "\n✓ Dev stack ready"
	@echo "  Supabase Studio : http://localhost:54323"
	@echo "  API (Postgres)  : postgresql://postgres:postgres@localhost:54322/postgres"
	@echo "  Redis           : redis://localhost:6379"
	@echo "  RabbitMQ UI     : http://localhost:15672 (vidyai/vidyai_dev)"

# Stop everything
stop:
	supabase stop
	docker compose -f infra/docker-compose.yml down

# Reset DB and re-run migrations
db-reset:
	supabase db reset

# Check status
db-status:
	supabase status

# Run migrations only
db-migrate:
	supabase db push

# Show Supabase local keys (copy to .env)
db-keys:
	supabase status
