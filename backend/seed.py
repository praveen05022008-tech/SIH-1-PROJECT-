from datetime import datetime
from database import engine, SessionLocal, Base
from models import User
from auth import get_password_hash

def init_db():
    print("Verifying database schema tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Only seed the default System Admin if not already present
        admin_email = "admin@refinery.safe"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            print(f"Creating System Administrator account: {admin_email}")
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash("password123"),
                name="System Administrator",
                role="Admin",
                id_number="ADM-001",
                phone="+91 98765 43210",
                address="Central HSE Command",
                approval_status="Approved",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("System Administrator account created.")
        else:
            existing_admin.approval_status = "Approved"
            existing_admin.is_active = True
            db.commit()

    except Exception as e:
        print("Error during admin initialization:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
