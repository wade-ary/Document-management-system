# SIH 25080

Advait Bhau Rocks!!
## Backend Setup : 

This project is managed using [Poetry](https://python-poetry.org/), a tool for dependency management and packaging in Python. This README provides a guide on how to set up, install dependencies, and use Poetry in this project.

## Prerequisites
- Python 3.11 (or the required version specified in `pyproject.toml`)
- Poetry

### Installing Poetry on macOS
For the latest macOS systems, use the official Poetry installer:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

After installation, add Poetry to your PATH by adding this line to your shell profile (`~/.zshrc` for zsh or `~/.bash_profile` for bash):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then restart your terminal or run:
```bash
source ~/.zshrc  # for zsh
# or
source ~/.bash_profile  # for bash
```

**Alternative installation methods:**
- Via Homebrew: `brew install poetry`
- Via pip: `pip install poetry` (not recommended for system-wide installation)
- For detailed instructions, visit [Poetry's installation guide](https://python-poetry.org/docs/#installation)

## Setting Up the Project

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Set Up Poetry Environment
Ensure you are using the correct Python version:
```bash
poetry env use python3.11 
```
or 
```
```markdown
poetry env use {your python bin path} 
```

Find that using "where python" in Git bash 

**For macOS users:**
Find your Python path using:
```bash
which python3.11
# or
which python3
```

Then use that path with Poetry:
```bash
poetry env use /usr/bin/python3.11
# or whatever path you found above
```


### 3. Install Project Dependencies
Run the following command to install all dependencies as specified in `pyproject.toml`:
```bash
poetry install
```

This will create a virtual environment and install all required packages.

### 4. Activate the Poetry Shell
**For macOS users, use one of these methods:**

**Method 1: Poetry Shell (Recommended)**
```bash
poetry shell
```
This will activate the Poetry environment and you'll see your prompt change to indicate you're in the Poetry environment.

**Method 2: Get Environment Path**
```bash
poetry env info --path
```
This gives you the path to the virtual environment and you can activate it manually if needed.

To deactivate the Poetry shell:
```bash
exit
# or simply close the terminal
```

### 5. Download Spacy configuration 
Downloads necessary sub-libraries for the project 

```bash
poetry run python setup.py
```

## Running the Project
Once the environment is set up and dependencies are installed, you can run your project using:
```bash
poetry run flask run
```

## Additional Setup for Team Members

### MongoDB Setup
Ensure MongoDB is installed and running:
```bash
# Install MongoDB on macOS
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

### Environment Configuration
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your local settings if needed

### Validation
Run the environment validation script to ensure everything is set up correctly:
```bash
poetry run python validate_env.py
```

## Troubleshooting

### Common Issues and Solutions

**1. Poetry command not found:**
```bash
# Ensure Poetry is in your PATH
echo $PATH | grep -o "$HOME/.local/bin"
# If empty, add to your shell profile:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**2. Python version mismatch:**
```bash
# Check your Python version
python3.11 --version
# If not found, install Python 3.11
brew install python@3.11
# Then set Poetry to use it
poetry env use python3.11
```

**3. Dependency installation fails:**
```bash
# Clear all caches and reinstall
poetry cache clear pypi --all
poetry env remove python
poetry env use python3.11
poetry install
```

**4. Table extraction dependencies (OpenCV/PaddleOCR):**
```bash
# On macOS, install system dependencies
brew install opencv

# Download PaddleOCR models manually if auto-download fails
poetry run python -c "import paddleocr; paddleocr.PaddleOCR(use_angle_cls=True, lang='en')"
```

**5. MongoDB connection issues:**
- Ensure MongoDB is running: `brew services list | grep mongodb`
- Check connection string in `.env` file
- Default connection: `mongodb://localhost:27017`

## Development Notes

### Enhanced Table Extraction
The project now includes improved table extraction capabilities:
- **Camelot**: For vector-based PDFs (lattice and stream methods)
- **OpenCV + PaddleOCR**: For scanned PDFs with enhanced column detection
- **Improved cell splitting**: Better detection of table boundaries and column structures

### Project Structure
- `backend/`: Flask backend with document processing
- `frontend/`: Next.js frontend application
- `pyproject.toml`: Poetry configuration with all dependencies
- `validate_env.py`: Environment validation script

## Team Collaboration

### For New Team Members
1. Clone the repository
2. Follow the setup steps above **exactly** using Poetry
3. Run `poetry run python validate_env.py` to verify setup
4. Contact team lead if validation fails

### Before Committing
Always ensure your changes work in a clean Poetry environment:
```bash
poetry install --sync
poetry run python validate_env.py
poetry run flask run  # Test backend
```

### Adding New Dependencies
```bash
# Add production dependencies
poetry add package-name

# Add development dependencies  
poetry add --group dev package-name

# Update lock file for team
poetry lock --no-update
```
# Using Homebrew (recommended)
brew install python@3.11

# Or using pyenv
brew install pyenv
pyenv install 3.11.9
pyenv global 3.11.9
```

### Installing Poetry on macOS
```bash
# Official installer (recommended)
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
poetry --version
```

### Installing Node.js
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

## 🛠️ Backend Setup (Python Flask)

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd SIH2025-25080
```

### 2. Set Python Version
```bash
# Ensure Poetry uses Python 3.11
poetry env use python3.11

# If the above doesn't work, find your Python 3.11 path
which python3.11
# Then use the full path
poetry env use /usr/local/bin/python3.11
```

### 3. Install Dependencies
```bash
# Install all dependencies from pyproject.toml
poetry install

# This will create a virtual environment and install:
# - Flask and web framework dependencies
# - MongoDB drivers
# - ML/AI libraries (OpenAI, LangChain, etc.)
# - PDF processing libraries (PyPDF2, pymupdf)
# - Table extraction libraries (camelot-py, tabula-py, opencv-python)
# - OCR libraries (PaddleOCR)
# - And many more...
```

### 4. Activate Virtual Environment
```bash
# Method 1: Poetry shell (recommended)
poetry shell

# Method 2: Get activation path and activate manually
poetry env info --path
# Then: source <path>/bin/activate
```

### 5. Validate Environment Setup
```bash
# Validate your environment setup
poetry run python validate_env.py

# This will check:
# - Python version compatibility
# - All required dependencies
# - MongoDB connection
# - Required models and data files
```

### 6. Download Required Models (if needed)
```bash
# Download spaCy models and other required data
poetry run python setup.py
```

### 6. Environment Configuration
```bash
# Copy environment template (if available)
cp .env.example .env

# Edit the .env file with your configuration:
# - MongoDB connection string  
# - OpenAI API key
# - Other service credentials
```

### 7. Quick Setup Script (Alternative)
```bash
# Use the automated setup script for one-command setup
chmod +x setup_env.sh
./setup_env.sh

# This script will:
# - Check system requirements
# - Install dependencies
# - Validate environment
# - Set up required models
```

### 7. Start Backend Server
```bash
# From project root
poetry run python app.py

# Or if in poetry shell
python app.py

# Or use the Poetry script
poetry run start-backend

# Server will start on http://localhost:5000
```

## 🌐 Frontend Setup (Next.js)

### 1. Navigate to Frontend
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Start Development Server
```bash
npm run dev
# or
yarn dev

# Frontend will start on http://localhost:3000
```

## 📦 Dependencies Overview

### Backend Python Dependencies
The following major libraries are included:

**Core Framework:**
- Flask 3.0.3 (Web framework)
- FastAPI 0.115.5 (Alternative API framework)
- Gunicorn 21.2.0 (Production server)

**Database & Storage:**
- pymongo 4.10.1 (MongoDB driver)
- redis 5.0.8 (Caching)

**AI & ML:**
- openai 1.55.3 (OpenAI API)
- langchain 0.3.0 (LLM framework)
- google-generativeai 0.8.5 (Google AI)
- anthropic 0.34.2 (Claude API)

**Document Processing:**
- PyPDF2 3.0.1 (PDF reading)
- pymupdf 1.24.14 (Advanced PDF processing)
- python-docx 1.1.2 (Word documents)
- python-pptx 1.0.2 (PowerPoint)

**Table Extraction:**
- camelot-py[cv] 1.0.9 (Table extraction from PDFs)
- tabula-py 2.10.0 (Alternative table extraction)
- opencv-python 4.10.0.84 (Computer vision for table detection)

**OCR & Text Processing:**
- paddleocr 2.7.0.3 (OCR engine)
- paddlepaddle 2.6.0 (Deep learning framework)
- spacy 3.7.5 (NLP library)

**Utilities:**
- pandas 2.2.3 (Data manipulation)
- numpy 1.26.0 (Numerical computing)
- pillow 10.4.0 (Image processing)

## 🔧 Troubleshooting

### Common Issues

**1. Poetry not found:**
```bash
# Ensure Poetry is in PATH
export PATH="$HOME/.local/bin:$PATH"
```

**2. Python version mismatch:**
```bash
# Force Poetry to use correct Python
poetry env remove python
poetry env use python3.11
poetry install
```

**3. OpenCV installation issues:**
```bash
# If OpenCV fails to install
brew install opencv
poetry install
```

**4. Port 5000 already in use (macOS AirPlay):**
```bash
# Kill existing processes
lsof -ti:5000 | xargs kill -9

# Or disable AirPlay Receiver in System Preferences
```

**5. MongoDB connection issues:**
- Ensure MongoDB is installed and running
- Check connection string in `.env` file
- Default connection: `mongodb://localhost:27017`

### Clean Installation
If you encounter persistent issues:

```bash
# Remove virtual environment
poetry env remove python

# Clear Poetry cache
poetry cache clear pypi --all

# Reinstall
poetry env use python3.11
poetry install
```

## 🚀 Production Deployment

### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment
```bash
# Install production dependencies
poetry install --only=main

# Run with Gunicorn
poetry run gunicorn --bind 0.0.0.0:5000 app:app
```

## 📝 Development Notes

### Table Extraction Features
This project includes advanced table extraction capabilities:
- **Vector PDFs**: Uses Camelot with lattice and stream algorithms
- **Scanned PDFs**: Uses OpenCV + PaddleOCR for table detection
- **Multi-format support**: Handles complex table structures
- **Data export**: Tables can be exported as CSV

### Running Tests
```bash
poetry run pytest
```

### Code Formatting
```bash
poetry run black .
poetry run isort .
```

### Adding New Dependencies
```bash
# Add new package
poetry add package-name

# Add development dependency
poetry add --group dev package-name

# Update lock file
poetry lock
```

## 👥 Team Collaboration Setup

### For New Team Members

**First Time Setup:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd SIH2025-25080

# 2. Run the automated setup
chmod +x setup_env.sh
./setup_env.sh

# 3. Validate everything works
poetry run python validate_env.py

# 4. Start development
poetry run python app.py
```

**Staying in Sync:**
```bash
# Pull latest changes
git pull origin main

# Update dependencies if pyproject.toml changed
poetry install

# Re-validate environment
poetry run python validate_env.py
```

### Dependency Management Rules

1. **Never edit `poetry.lock` manually** - This file is auto-generated
2. **Always use Poetry for adding dependencies**: `poetry add package-name`
3. **Commit both `pyproject.toml` and `poetry.lock`** when adding dependencies
4. **Run `poetry install`** after pulling changes that modify dependencies
5. **Use exact Python 3.11.x** - Other versions may cause issues

## 🆘 Getting Help

If you encounter issues:

1. **Check this README** - Most common issues are covered above
2. **Verify Python version** - Must be 3.11.x
3. **Clear and reinstall** - Remove poetry env and reinstall
4. **Check environment variables** - Ensure all required keys are set
5. **Contact team lead** - If issues persist

## 📂 Project Structure

```
SIH2025-25080/
├── backend/                 # Python Flask backend
│   ├── *.py                # Backend modules
│   └── requirements-table-extraction.txt
├── frontend/               # Next.js React frontend
├── project/               # Additional frontend project
├── templates/             # HTML templates
├── pyproject.toml        # Python dependencies
├── poetry.lock          # Locked dependency versions
└── README.md           # This file
```

---

**Happy Coding! 🎉**
