#!/usr/bin/env python3
"""
Snowdon Browser - Custom window for Snowdon file and settings GUIs
This script opens a webview window to display Snowdon's GUIs.
"""

import sys
import webbrowser

try:
    import webview
    HAS_WEBVIEW = True
except ImportError:
    HAS_WEBVIEW = False

def main():
    if len(sys.argv) < 2:
        print("Usage: snowdon-browser.py <url> [title]")
        print("Example: snowdon-browser.py http://localhost:8888 \"Snowdon File Upload\"")
        sys.exit(1)
    
    url = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "Snowdon Browser"
    
    if HAS_WEBVIEW:
        # Use pywebview for a custom window
        webview.create_window(
            title=title,
            url=url,
            width=1200,
            height=800,
            background_color="#f5f5f5"
        )
        webview.start()
    else:
        # Fallback to system browser
        print("pywebview not installed. Using system browser.")
        print("To install: pip install pywebview")
        webbrowser.open(url)

if __name__ == "__main__":
    main()
