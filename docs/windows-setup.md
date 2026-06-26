# Windows Install, Run, Test, And Package

Run these commands from `C:\Users\frien\Documents\New project`.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r apps\api\requirements.txt
python scripts\download_all_models.py
python -m pytest
python -m uvicorn app.main:app --app-dir apps\api --host 127.0.0.1 --port 8000 --reload
```
`http://127.0.0.1:8000
Open ` in a browser.

After the first setup, the application runs without paid cloud APIs. The ONNX model files are local under `models`, and the frontend is served from `apps\web\public`.

## Workspace-Local Dependency Fallback

If `py -3.13 -m venv .venv` fails during `ensurepip`, install dependencies into `.deps` and set `PYTHONPATH` before running tests or the server:

```powershell
python -m pip install --target .deps --cache-dir .pip-cache --index-url https://pypi.org/simple -r apps\api\requirements.txt
$env:PYTHONPATH = ".deps;apps\api"
python scripts\download_all_models.py
python -m pytest
python -m uvicorn app.main:app --app-dir apps\api --host 127.0.0.1 --port 8000 --reload
```

## Measure Local CPU Latency

```powershell
$env:PYTHONPATH = ".deps;apps\api"
python scripts\measure_latency.py
```

## Build Offline Zip

```powershell
$env:PYTHONPATH = ".deps;apps\api"
python scripts\package_offline.py
```

The zip is written to `dist\ai-playground-offline.zip`.

## Optional TypeScript Check

If Node.js and npm are installed:

```powershell
cd apps\web
npm install
npm run typecheck
cd ..\..
```

The browser-ready JavaScript bundle is checked in so the app can still run on machines that do not have Node installed.

