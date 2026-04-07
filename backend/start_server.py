import subprocess
import sys

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9001"],
    cwd=".",
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    shell=True
)

import time
time.sleep(5)

# Check if process is running
if proc.poll() is None:
    print("Server started OK")
    import urllib.request
    try:
        resp = urllib.request.urlopen("http://localhost:9001/health")
        print(f"Health: {resp.read().decode()}")
    except Exception as e:
        print(f"Health check failed: {e}")
else:
    print("Server failed to start")
    output, _ = proc.communicate()
    print(output)