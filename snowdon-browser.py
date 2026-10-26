#!/usr/bin/env python3
"""
Snowdon Browser - Opens Snowdon GUIs in the system browser
This script uses PySimpleGUI to show a simple window while opening the browser.
"""

import sys
import webbrowser

try:
    import PySimpleGUI as sg
    HAS_PYSIMPLEGUI = True
except ImportError:
    HAS_PYSIMPLEGUI = False

def main():
    if len(sys.argv) < 2:
        print("Usage: snowdon-browser.py <url> [title]")
        print("Example: snowdon-browser.py http://localhost:8888 \"Snowdon File Upload\"")
        sys.exit(1)
    
    url = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "Snowdon Browser"
    
    # Open the URL in the system browser
    webbrowser.open(url)
    
    if HAS_PYSIMPLEGUI:
        # Show a simple notification window
        layout = [
            [sg.Text(f"Opening {url}...", key='-TEXT-')],
            [sg.Text("Browser window opened.", key='-STATUS-')],
            [sg.Button("OK", key='-OK-')]
        ]
        
        window = sg.Window(title, layout, size=(400, 150), finalize=True)
        
        while True:
            event, values = window.read()
            if event in (sg.WIN_CLOSED, '-OK-'):
                break
        
        window.close()
    else:
        print(f"Opened {url} in your system browser.")

if __name__ == "__main__":
    main()
