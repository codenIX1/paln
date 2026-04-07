try:
    from app.main import app
    print("App loaded OK!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()