OUTDIR  := build
TEXFILE := Master File.tex

.PHONY: all clean install-deps

all:
	mkdir -p "$(OUTDIR)"
	latexmk -pdf -outdir="$(OUTDIR)" -interaction=nonstopmode "$(TEXFILE)"

clean:
	rm -rf "$(OUTDIR)"

install-deps:
	@echo "Installing LaTeX dependencies..."
	sudo apt-get update -qq
	sudo apt-get install -y \
		texlive-latex-base \
		texlive-latex-extra \
		texlive-latex-recommended \
		texlive-fonts-recommended \
		texlive-fonts-extra \
		texlive-pictures \
		texlive-science \
		latexmk
	@echo "Done."
