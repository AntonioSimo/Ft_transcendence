#!/bin/bash

# Get the IP address of the current machine
IP=$(hostname -I | awk '{print $1}')

mkdir -p cert

echo "Generating self-signed certificate for IP: $IP"

# Generate a self-signed certificate

cd ./cert

openssl req -x509 -nodes -newkey rsa:2048 -days 365   -keyout key.pem -out cert.pem   -subj "/C=NL/ST=North Holland/L=Amsterdam/O=Transcendence/OU=Transcendence/CN=localhost"   -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:backend,DNS:gameserver,IP:${IP}"