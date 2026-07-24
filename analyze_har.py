import json
import sys
from urllib.parse import urlparse

def analyze_har(filepath):
    print(f"--- Analyzing {filepath} ---")
    with open(filepath, 'r', encoding='utf-8') as f:
        har = json.load(f)
    
    entries = har['log']['entries']
    
    # 1. Look for the main document request (usually the first HTML request)
    main_doc_entry = None
    for entry in entries:
        if 'text/html' in entry['response']['content'].get('mimeType', '') and entry['request']['method'] == 'GET':
            main_doc_entry = entry
            break
            
    if main_doc_entry:
        print(f"Main Document URL: {main_doc_entry['request']['url']}")
        print(f"Status: {main_doc_entry['response']['status']}")
        
        # Look at cache headers
        headers_of_interest = ['cache-control', 'x-litespeed-cache', 'x-lsadc-cache', 'cf-cache-status', 'server']
        print("Relevant Headers:")
        for header in main_doc_entry['response']['headers']:
            if header['name'].lower() in headers_of_interest:
                print(f"  {header['name']}: {header['value']}")
    else:
        print("Could not find main HTML document.")

    # 2. Look for errors (Status >= 400)
    print("\nErrors (Status >= 400):")
    errors_found = False
    for entry in entries:
        status = entry['response']['status']
        if status >= 400:
            errors_found = True
            url = entry['request']['url']
            print(f"  {status} - {url}")
    if not errors_found:
        print("  None")
        
    print("\n")

if __name__ == "__main__":
    analyze_har(sys.argv[1])
    analyze_har(sys.argv[2])
