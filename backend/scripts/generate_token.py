import os
import webbrowser
import requests
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
from supabase import create_client, Client

# Load Env
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
UPSTOX_API_KEY = os.getenv("UPSTOX_API_KEY")
UPSTOX_API_SECRET = os.getenv("UPSTOX_API_SECRET")
REDIRECT_URI = "http://localhost:5000/callback"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global holder for code
auth_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/callback":
            query = parse_qs(parsed_path.query)
            code = query.get('code', [None])[0]
            if code:
                auth_code = code
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"Login Successful! You can close this tab.")
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Failed to get code.")
        else:
            self.send_response(404)
            self.end_headers()

def get_access_token(code):
    url = "https://api.upstox.com/v2/login/authorization/token"
    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "code": code,
        "client_id": UPSTOX_API_KEY,
        "client_secret": UPSTOX_API_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(url, headers=headers, data=data)
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Error fetching token: {response.text}")
        return None

def main():
    if not UPSTOX_API_KEY or not UPSTOX_API_SECRET:
        print("Please set UPSTOX_API_KEY and UPSTOX_API_SECRET in .env")
        return

    # 1. Start Local Server
    server = HTTPServer(('localhost', 5000), CallbackHandler)
    
    # 2. Open Browser
    login_url = f"https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id={UPSTOX_API_KEY}&redirect_uri={REDIRECT_URI}"
    print(f"Opening browser for login: {login_url}")
    webbrowser.open(login_url)
    
    # 3. Wait for Code
    print("Waiting for callback on port 5000...")
    while auth_code is None:
        server.handle_request()
    
    print(f"Auth Code Received: {auth_code[:10]}...")
    
    # 4. Exchange for Token
    token = get_access_token(auth_code)
    
    if token:
        print(f"Access Token Generated: {token[:10]}...")
        
        # 5. Push to Supabase
        # We assume specific row for TODAY exists, or we create it
        # Note: In production logic, ensure timezone matches 'current_date' of DB
        print("Uploading to Supabase...")
        try:
             # Upsert for today
             response = supabase.table("daily_state").upsert({
                 "date": "now()", # Let Supabase resolve 'now()' or use Python date
                 "upstox_token": token
             }, on_conflict="date").execute()
             print("✅ Token saved to daily_state!")
        except Exception as e:
            print(f"❌ Failed to save to Supabase: {e}")
            
    else:
        print("❌ Failed to generate access token.")

if __name__ == "__main__":
    main()
