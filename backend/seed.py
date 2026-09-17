from database import engine, SessionLocal, Base
from models import User, IncidentReport, AuditLog, Notification
from auth import get_password_hash

def init_db():
    print("Creating tables in TiDB Cloud database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    db = SessionLocal()
    try:
        # Check if default admin exists
        admin_email = "admin@refinery.safe"
        existing_admin = db.query(User).filter(User.email == admin_email).first()

        if not existing_admin:
            print(f"Seeding System Admin: {admin_email}")
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash("password123"),
                name="System Administrator",
                role="Admin",
                id_number="ADM-001",
                phone="+91 98765 43210",
                address="Central HSE Command, Jamnagar Complex",
                approval_status="Approved",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Default System Admin seeded successfully!")
        else:
            print(f"System Admin ({admin_email}) already exists. Ensuring Approved status.")
            existing_admin.approval_status = "Approved"
            existing_admin.is_active = True
            db.commit()

        # Also seed admin@sifshield.com alias if not present
        alias_email = "admin@sifshield.com"
        existing_alias = db.query(User).filter(User.email == alias_email).first()
        if not existing_alias:
            alias_user = User(
                email=alias_email,
                password_hash=get_password_hash("Admin@12345"),
                name="Chief HSE Director",
                role="Admin",
                id_number="ADM-002",
                phone="+91 98765 00000",
                address="Global Safety Directorate",
                approval_status="Approved",
                is_active=True
            )
            db.add(alias_user)
            db.commit()
            print("System Admin alias seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
