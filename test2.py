import subprocess
try:
    subprocess.check_call(["python3", "-m", "pip", "install", "--require-hashes", "--only-binary", ":all:", "-r", "requirements-weekly-trend.txt"])
except Exception as e:
    print(f"Error: {e}")
