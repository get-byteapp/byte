#!/bin/bash
echo "Installing Byte..."

# Check if Homebrew is installed, install if not
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew already installed"
fi

echo "Now installing Byte..."
brew tap get-byteapp/byte
brew install --cask byte
echo "Done! Byte should now be installed."
read -p "Press Enter to close Terminal..."