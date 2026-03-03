#!/bin/bash
set -euo pipefail

# Only run in remote (cloud) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Installing LaTeX dependencies for cloud session..."

# Update package list and install TeX Live with required packages
apt-get update -qq
apt-get install -y --no-install-recommends \
  texlive-latex-base \
  texlive-latex-extra \
  texlive-latex-recommended \
  texlive-fonts-recommended \
  texlive-fonts-extra \
  texlive-pictures \
  texlive-science \
  latexmk \
  make

echo "LaTeX installation complete."
