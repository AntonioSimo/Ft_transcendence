all: prebuild build up

prebuild:
	cp ~/env/.env .env
	cp ~/env/Frontend/.env Frontend/.env
	cp ~/env/Backend/.env Backend/.env
	cp ~/env/GameServer/.env GameServer/.env
	./Frontend/script.sh
	./make_cert.sh

build:
	docker-compose -f ./docker-compose.yml build

up:
	docker-compose -f ./docker-compose.yml up -d

down:
	docker-compose -f ./docker-compose.yml down

stop:
	docker-compose -f ./docker-compose.yml stop

start:
	docker-compose -f ./docker-compose.yml start

logs:
	docker-compose -f ./docker-compose.yml logs -f

restart:
	docker-compose -f ./docker-compose.yml restart

down--volume:
	docker-compose -f ./docker-compose.yml down -v

rebuild: down--volume build up

rmi:
	docker rmi -f $(BACKEND_IMAGE_NAME) | true
	docker rmi -f $(FRONTEND_IMAGE_NAME) | true
	docker rmi -f $(GAME_IMAGE_NAME) | true

run: build up

clean: down--volume rmi
	@$(MAKE) reset-env

deep-clean:
	@$(MAKE) reset-env
	@docker-compose -f ./docker-compose.yml down -v
	@docker system prune --all --volumes -f
	@docker builder prune --all -f
	@rm -rf cert
	@rm .env
	@rm Frontend/.env
	@rm Backend/.env
	@rm GameServer/.env

re: clean run

reset-env:
	@echo "Resetting .env hostnames to localhost"
	@if [ -f Frontend/.env ]; then \
		sed -i "s|\b[0-9]\{1,3\}\\(\\.[0-9]\{1,3\}\\)\{3\}\b|localhost|g" Frontend/.env; \
	fi
	@if [ -f .env ]; then \
		sed -i "s|\b[0-9]\{1,3\}\\(\\.[0-9]\{1,3\}\\)\{3\}\b|localhost|g" .env; \
	fi

.PHONY: all build prebuild up down stop start logs restart down--volume rmi run clean re reset-env deep-clean
