try:
    from app.routes import auth, sources, chat, admin, summarize
    print("All routes imported OK!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()