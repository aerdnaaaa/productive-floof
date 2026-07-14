# Productive Floof 🐾

Productive Floof is an ultra-minimalistic, aesthetically pleasing task manager designed to help you stay organized and productive. The project is split into a **FastAPI** Python backend and a **React + TypeScript + Vite** frontend.

---

## Development Details (Local Development)

This section describes the repository architecture, folder structure, and the step-by-step commands to run the application locally outside of Docker.

### Project Directory Structure

```text
productive-floof/
├── backend/            # Python FastAPI backend application
│   ├── app/            # Main application source code
│   │   ├── core/       # Configurations, database connection, scheduler
│   │   ├── models/     # SQLAlchemy database models
│   │   ├── routers/    # API endpoint routers (auth, tags, tasks)
│   │   └── schemas/    # Pydantic data schemas
│   ├── requirements.txt # Python package dependencies
│   └── venv/           # Python virtual environment (pre-configured)
│
└── frontend/           # React + TypeScript frontend application (Vite)
    ├── src/            # Components, styling, services, and hooks
    ├── public/         # Static assets
    ├── nginx.conf      # Custom configuration for Nginx Docker container
    └── package.json    # Frontend project configuration & scripts
```

### Local Backend Setup & Execution

The backend is built with **FastAPI** and uses **SQLAlchemy** with a local SQLite database (`productive_floof.db`). 

> [!NOTE]
> Database tables are automatically generated on startup when you launch the application. No separate database migration command is required.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate the Virtual Environment:**
   Depending on your operating system and shell, run:
   * **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Development Server:**
   Start the Uvicorn ASGI server with hot-reload enabled:
   ```bash
   uvicorn app.main:app --reload
   ```

   * **API URL:** `http://localhost:8000`
   * **Swagger UI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   * **ReDoc Docs:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Local Frontend Setup & Execution

The frontend is built using **React 19**, **Vite 8**, **TypeScript**, and **TailwindCSS** / vanilla CSS.

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   Launch the Vite local development server:
   ```bash
   npm run dev
   ```

   * **App URL:** [http://localhost:5173](http://localhost:5173)

---

### Configuration & Environment Variables

#### Backend Configuration
Backend configuration is managed in `app/core/config.py` and can be customized via a `.env` file in the `backend/` directory:
1. Copy the environment variables example file to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and update the settings. Make sure to change `JWT_SECRET` to a secure custom value for production environments.

* `DATABASE_URL`: `sqlite:///./productive_floof.db` (Default SQLite connection)
* `JWT_SECRET`: A default development-only token is configured as a fallback. Overriding it in `.env` is highly recommended.
* `JWT_ALGORITHM`: `HS256`
* `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440` (24 hours)

#### Frontend Configuration
* The frontend automatically connects to the backend at `http://localhost:8000/` by default.
* You can configure it dynamically by setting the `VITE_API_BASE_URL` environment variable.

---

## Docker Deployment Steps

This section details how to build, run, configure, and tear down the containerized environment.

### Prerequisites

Ensure you have the following installed on your machine:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

---

### 1. Build and Run the Entire Application

From the root directory of the project where `docker-compose.yml` resides, run the following command to build and launch all containers:

```bash
docker compose up --build
```

This command will:
1. Build the **FastAPI backend** container, install its python dependencies, and expose it on port `8000`.
2. Build the **React + Vite frontend** multi-stage container, bundle assets, configure **Nginx**, and expose the site on port `3000`.
3. Set up a persistent volume for the SQLite database so tasks are saved even when containers are restarted.

---

### 2. Verify the Services

Once the build is complete and the containers are running:
* **Frontend Web Application:** Open [http://localhost:3000](http://localhost:3000) in your web browser.
* **Backend API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs) to verify API routing.

---

### 3. Data Persistence (SQLite Volume)

In a containerized environment, file changes inside the container are lost when it is destroyed. To prevent your tasks and accounts from being wiped out:
* A Docker volume named `backend-data` is mounted to the container path `/app/data`.
* The SQLite database is written to `/app/data/productive_floof.db`.
* Any database schema or data updates persist across `docker compose down` and restarts.

---

### 4. Customizing Backend API URL

If you want the production frontend to talk to a different backend API server, you can modify the build argument in `docker-compose.yml`:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_BASE_URL=http://your-remote-api-url/
```

---

### 5. Stopping the Application

To stop the containers running in the foreground, press `Ctrl + C`. To stop them and clean up containers/networks, run:

```bash
docker compose down
```

If you also wish to delete the persistent database volume (warning: this deletes all tasks/users):
```bash
docker compose down -v
```

---

## Publishing to GitHub

If you plan to publish this project to GitHub, follow these recommendations and steps:

### 1. Ensure Sensitive Data is Excluded
We have created a root-level `.gitignore` file that automatically excludes local SQLite database files, environment config (`.env`), Python virtual environments, and node modules.

### 2. Configure Local Environment
Never commit active credentials or private keys. If you need local custom secrets:
1. In the `backend/` directory, copy the template environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your custom values, especially a secure, random `JWT_SECRET`. The application automatically reads configurations from the `.env` file if it is present.

### 3. Initialize Git and Push to GitHub
If the `git` command is not recognized in your terminal, it is likely not installed or not added to your system's `PATH`. You can still initialize and publish your repository easily:

* **Using VS Code (Recommended):**
  1. Open the project folder in VS Code.
  2. Click on the **Source Control** icon on the left sidebar (or press `Ctrl + Shift + G`).
  3. Click **Initialize Repository**.
  4. Type a commit message (e.g., "Initial commit") and click **Commit**.
  5. Click **Publish Branch** to publish directly to your GitHub account.

* **Using Git CLI (once installed):**
  1. Initialize the repository:
     ```bash
     git init
     ```
  2. Add files:
     ```bash
     git add .
     ```
  3. Commit changes:
     ```bash
     git commit -m "Initial commit"
     ```
  4. Create a new repository on GitHub, then link and push:
     ```bash
     git remote add origin https://github.com/your-username/productive-floof.git
     git branch -M main
     git push -u origin main
     ```
