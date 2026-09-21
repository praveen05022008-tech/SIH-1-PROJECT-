from datetime import datetime
from sqlalchemy import inspect, text
from database import engine, SessionLocal, Base
from models import User
from auth import get_password_hash

def init_db():
    print("Verifying database schema tables...")
    Base.metadata.create_all(bind=engine)

    # Automatically add missing columns if schema evolved
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        with engine.connect() as conn:
            for name, table in Base.metadata.tables.items():
                if name in tables:
                    existing_cols = {c['name'] for c in inspector.get_columns(name)}
                    for col in table.columns:
                        if col.name not in existing_cols:
                            type_str = str(col.type)
                            if 'VARCHAR' in type_str or 'String' in type_str:
                                length = getattr(col.type, 'length', 255) or 255
                                col_def = f"VARCHAR({length})"
                            elif 'TEXT' in type_str:
                                col_def = "TEXT"
                            elif 'INTEGER' in type_str:
                                col_def = "INT"
                            elif 'FLOAT' in type_str:
                                col_def = "FLOAT"
                            elif 'BOOLEAN' in type_str:
                                col_def = "BOOLEAN"
                            elif 'DATETIME' in type_str:
                                col_def = "DATETIME"
                            else:
                                col_def = type_str

                            alter_sql = f"ALTER TABLE `{name}` ADD COLUMN `{col.name}` {col_def} NULL;"
                            print(f"Auto-migrating missing column: {alter_sql}")
                            conn.execute(text(alter_sql))
                            conn.commit()
    except Exception as ex:
        print("Schema column verification check note:", ex)

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
