#!/bin/bash
echo "Installing Byte..."
echo "First, installing Homebrew..."
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo "Now installing Byte..."
brew tap usebyte/byte
brew install --cask byte
echo "Done! Byte should now be installed."
read -p "Press Enter to close Terminal..."