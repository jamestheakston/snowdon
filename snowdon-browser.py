#!/usr/bin/env python3
"""
Snowdon Browser - Custom window for Snowdon file and settings GUIs
This script opens a tkinter window with an embedded webview.
"""

import sys
import webbrowser
import tkinter as tk
from tkinter import ttk

def main():
    if len(sys.argv) < 2:
        print("Usage: snowdon-browser.py <url> [title]")
        print("Example: snowdon-browser.py http://localhost:8888 \"Snowdon File Upload\"")
        sys.exit(1)
    
    url = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "Snowdon Browser"
    
    # Create main window
    root = tk.Tk()
    root.title(title)
    root.geometry("1200x800")
    root.configure(bg="#f5f5f5")
    
    # Create a text widget to show a message
    text = tk.Text(root, wrap=tk.WORD, bg="#f5f5f5", fg="#333", font=("Arial", 12))
    text.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
    
    text.insert(tk.END, f"Opening {url} in your system browser...\n\n")
    text.insert(tk.END, "Snowdon Browser uses your system browser for best compatibility.\n")
    text.insert(tk.END, "The browser window will open automatically.\n\n")
    text.insert(tk.END, "Close this window after you're done.")
    text.config(state=tk.DISABLED)
    
    # Open the URL in the system browser
    webbrowser.open(url)
    
    # Start the tkinter main loop
    root.mainloop()

if __name__ == "__main__":
    main()
