import subprocess
import sys
import spacy

def install_spacy_model():
    try:
        spacy.load("en_core_web_sm")
        print("Model 'en_core_web_sm' is already installed.")
    except OSError:
        print("Model 'en_core_web_sm' not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])

if __name__ == "__main__":
    install_spacy_model()
    print("SpaCy model setup complete.")
