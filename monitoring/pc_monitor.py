"""
PC Monitoring Agent — Phase 5A
AI-Based Smart Computer Laboratory Management and Asset Monitoring System

Standalone background process that collects PC health metrics using psutil
and sends them to the backend API for AI-based health prediction.

This agent does NOT depend on the React website being open.
It runs independently as a background process on each monitored PC.

Usage:
    python pc_monitor.py --pc-id LAB1-PC-01 --server http://localhost:8000 --interval 60
"""

import os
import argparse
import time
import json
import logging
import psutil
import requests

try:
    from plyer import notification
    PLYER_AVAILABLE = True
except ImportError:
    PLYER_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_error_count():
    try:
        import win32evtlog
        server = 'localhost'
        logtype = 'System'
        hand = win32evtlog.OpenEventLog(server, logtype)
        flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
        total = win32evtlog.GetNumberOfEventLogRecords(hand)
        
        # Simple count for demonstration purposes. In reality, you'd check time bounds.
        # This is a naive implementation due to the complexity of Windows Event Log API in Python.
        # We'll just return a small random number or 0 if we can't properly filter by time in this simple script.
        return 0
    except ImportError:
        return 0
    except Exception as e:
        logging.error(f"Error reading event log: {e}")
        return 0

def show_notification(status):
    title = "PC Status"
    if status == 'Healthy':
        msg = "🟢 Working Normally"
    elif status == 'Warning':
        msg = "🟡 Performance Issue Detected — Please contact Lab Assistant"
    elif status == 'Critical':
        msg = "🔴 Critical Issue Detected — Please contact Lab Assistant"
    else:
        msg = f"Status: {status}"
        
    if not PLYER_AVAILABLE:
        logging.info(f"[DESKTOP STATUS] {title}: {msg}")
        return

    try:
        notification.notify(
            title=title,
            message=msg,
            app_name="PC Monitor",
            timeout=5
        )
    except Exception as e:
        logging.error(f"Failed to show notification: {e}")

def monitor_pc(pc_id, server_url, interval, once=False):
    logging.info(f"Starting PC monitoring for {pc_id}")
    logging.info(f"Server URL: {server_url}")
    logging.info(f"Interval: {interval} seconds (once mode: {once})")

    while True:
        try:
            # Collect metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory()
            ram_usage = ram.percent
            
            disk_path = 'C:\\' if os.name == 'nt' else '/'
            disk = psutil.disk_usage(disk_path)
            disk_usage = disk.percent
            
            net_io = psutil.net_io_counters()
            bytes_sent = net_io.bytes_sent
            bytes_recv = net_io.bytes_recv
            
            error_count = get_error_count()

            payload = {
                "pc_id": pc_id,
                "cpu_usage": cpu_usage,
                "ram_usage": ram_usage,
                "disk_usage": disk_usage,
                "network_bytes_sent": bytes_sent,
                "network_bytes_recv": bytes_recv,
                "error_count": error_count,
                "timestamp": time.time()
            }

            logging.info(f"Collected metrics: CPU {cpu_usage}%, RAM {ram_usage}%, Disk {disk_usage}%, Errors {error_count}")
            
            # Send to server
            api_endpoint = f"{server_url}/api/pc-health"
            response = requests.post(api_endpoint, json=payload, timeout=10)
            
            if response.status_code in (200, 201):
                data = response.json()
                health_prediction = data.get('health_prediction', 'Healthy')
                confidence = data.get('confidence', 0.0)
                possible_issue = data.get('possible_issue', 'Normal performance')
                logging.info(f"Server prediction: {health_prediction} (conf: {confidence:.2f}) — {possible_issue}")
                
                # Show notification based on prediction
                show_notification(health_prediction)
            else:
                logging.warning(f"Failed to send data to server. Status code: {response.status_code}, response: {response.text}")

        except requests.exceptions.RequestException as e:
            logging.error(f"Connection error: {e}. Retrying in next cycle...")
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
            
        if once:
            logging.info("Single collection pass completed (--once enabled). Exiting.")
            break

        time.sleep(interval)

if __name__ == "__main__":
    import socket
    parser = argparse.ArgumentParser(description="PC Monitoring Agent")
    parser.add_argument("--pc-id", type=str, default="AML-PC-001", help="Unique ID for this PC (default: AML-PC-001)")
    parser.add_argument("--server", type=str, default="http://localhost:8000", help="Backend API server URL")
    parser.add_argument("--interval", type=int, default=30, help="Collection interval in seconds (default: 30)")
    parser.add_argument("--once", action="store_true", help="Run a single collection cycle and exit")
    
    args = parser.parse_args()
    
    monitor_pc(args.pc_id, args.server, args.interval, once=args.once)
