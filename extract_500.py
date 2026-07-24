import json
import sys

def extract_500(filepath):
    print(f"--- Analyzing 500 errors in {filepath} ---")
    with open(filepath, 'r', encoding='utf-8') as f:
        har = json.load(f)
    
    entries = har['log']['entries']
    for entry in entries:
        if entry['response']['status'] == 500:
            print(f"URL: {entry['request']['url']}")
            
            # Print POST data if it exists
            if 'postData' in entry['request']:
                print(f"POST Data:")
                text = entry['request']['postData'].get('text', '')
                print(text)
            
            # Print Response
            print(f"Response Body:")
            resp_text = entry['response']['content'].get('text', '')
            # If it's huge, truncate it
            if len(resp_text) > 1000:
                print(resp_text[:1000] + "...[truncated]")
            else:
                print(resp_text)
            print("-" * 40)

if __name__ == "__main__":
    extract_500(sys.argv[1])
