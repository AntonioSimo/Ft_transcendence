#!/bin/bash

# Get the IP address of the current machine
IP=$(hostname -I | awk '{print $1}')

echo "Configuring application to use IP address: $IP"

# Update Frontend .env
echo "Updating Frontend/.env..."
sed -i "s|localhost|$IP|g" Frontend/.env

# Update root .env if needed
if [ -f .env ]; then
    echo "Updating root .env..."
    sed -i "s|localhost|$IP|g" .env
fi

echo "✅ Configuration complete!"
echo "Frontend will be available at: https://$IP:5173" 
echo "Other devices on your network can now connect to these URLs"