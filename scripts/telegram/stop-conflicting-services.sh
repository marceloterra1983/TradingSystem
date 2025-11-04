#!/bin/bash

echo "========================================="
echo "Stop Conflicting Services for Telegram Stack"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking for processes on required ports...${NC}"
echo ""

# Required ports
PORTS=(5434 6379 6380 26379 5672 15672 6434)

for port in "${PORTS[@]}"; do
    echo -n "Port $port: "
    PID=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$PID" ]; then
        echo -e "${RED}IN USE (PID: $PID)${NC}"
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null)
        echo "  Process: $PROCESS"
        
        # Try to stop Redis service if it's running
        if [[ "$PROCESS" == *"redis"* ]]; then
            echo "  Stopping Redis service..."
            systemctl stop redis-server 2>/dev/null || true
            systemctl stop redis 2>/dev/null || true
            
            # If still running, kill the process
            if ps -p $PID > /dev/null 2>&1; then
                echo "  Killing process $PID..."
                kill -9 $PID 2>/dev/null || true
            fi
        else
            echo "  Killing process $PID..."
            kill -9 $PID 2>/dev/null || true
        fi
        
        sleep 1
        
        # Verify it's stopped
        if lsof -ti:$port >/dev/null 2>&1; then
            echo -e "  ${RED}✗ Still in use!${NC}"
        else
            echo -e "  ${GREEN}✓ Port freed${NC}"
        fi
    else
        echo -e "${GREEN}FREE${NC}"
    fi
done

echo ""
echo "========================================="
echo "Checking for Redis systemd services..."
echo "========================================="

# Stop Redis systemd services
for service in redis-server redis redis.service; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        echo -e "${YELLOW}Stopping $service...${NC}"
        systemctl stop $service
        systemctl disable $service
        echo -e "${GREEN}✓ $service stopped and disabled${NC}"
    fi
done

echo ""
echo "========================================="
echo "Final Port Check"
echo "========================================="

ALL_FREE=true
for port in "${PORTS[@]}"; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${RED}✗ Port $port still in use!${NC}"
        ALL_FREE=false
    else
        echo -e "${GREEN}✓ Port $port is free${NC}"
    fi
done

echo ""
if [ "$ALL_FREE" = true ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ All ports are now free!${NC}"
    echo -e "${GREEN}You can now run the Telegram stack.${NC}"
    echo -e "${GREEN}=========================================${NC}"
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}✗ Some ports are still in use.${NC}"
    echo -e "${RED}Please check manually with:${NC}"
    echo -e "${RED}  sudo lsof -i :<port>${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi

