#!/usr/bin/env python3
import sys
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(file_path)
        print(json.dumps({"success": True, "content": result.text_content}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
