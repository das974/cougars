#!/usr/bin/env bash
# Install Python requirements if any are missing

if [ ! -f /src/team-manager/requirements.txt ]; then
  exit 0
fi

python3 -c "import pulp" 2>/dev/null && exit 0

echo "Installing Python requirements..."
curl -sS https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages -q
python3 -m pip install -r /src/team-manager/requirements.txt --break-system-packages -q
echo "Done."
