"""Serve the standalone build on localhost, optionally opening a browser."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--open", action="store_true", help="Open the default browser")
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent / "dist"
    if not (directory / "Folio-Profile-Studio.html").is_file():
        parser.error("Standalone build missing. Run python build.py first.")
    print("Starting Folio preview", flush=True)
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        parser.exit(1, f"Cannot start local preview: {error}\n")
    with server:
        url = f"http://127.0.0.1:{server.server_port}/Folio-Profile-Studio.html"
        print(f"Folio preview ready: {url}", flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
