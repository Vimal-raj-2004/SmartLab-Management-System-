# PC Hardware Monitoring Agent Directory

This directory is reserved for Phase 5 PC Telemetry Agent:
- Python script leveraging `psutil`
- Collects real-time hardware telemetry:
  - CPU usage %
  - RAM memory %
  - Disk storage %
  - Error counts / Event logs
- Periodically streams data to FastAPI backend endpoints.
