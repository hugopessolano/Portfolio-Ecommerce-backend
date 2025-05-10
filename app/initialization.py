from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import *
from app.auth.hashing import hash_string

def create_admin_user(check_existing_users:bool, db:Session) -> None:
    """
    Creates an admin user if no users exist in the database.
    """
    try:
        if check_existing_users:
            user_count = db.query(Users).count()
            if user_count > 0:
                print("Users already exist in the database. Skipping admin user creation.")
                return

        print("No users found or check skipped. Creating admin user...")

        # Check and delete existing admin users with specific credentials
        existing_admins = db.query(Users).filter(
            Users.name == "admin",
            Users.email == "admin@admin.com"
        ).all()

        if existing_admins:
            print(f"Found {len(existing_admins)} existing admin user(s) with name='admin' and email='admin@admin.com'. Deleting them...")
            for admin in existing_admins:
                # Need to delete related UserRoles first if cascade is not set up
                db.query(UserRoles).filter(UserRoles.user_id == admin.id).delete(synchronize_session=False)
                db.delete(admin)
            db.flush() # Ensure deletions are processed before adding new user

        # 1. Create admin user
        hashed_password = hash_string("admin")
        admin_user = Users(
            name="admin",
            password=hashed_password,
            email="admin@admin.com", # Added a default email
            cross_store_allowed=True
        )
        db.add(admin_user)
        # We need to flush to get the admin_user.id for relationships
        db.flush()

        # 2. Get all permissions
        all_permissions = db.query(Permissions).all()
        if not all_permissions:
            print("Warning: No permissions found in the database. Admin user will have no permissions initially.")
            # Consider running build_permissions first if this happens often

        # 3. Create admin role
        admin_role = db.query(Roles).filter(Roles.name == "admin").first()
        if not admin_role:
            admin_role = Roles(name="admin")
            db.add(admin_role)
            db.flush() # Flush to get admin_role.id

        # 4. Assign all permissions to admin role
        role_permissions_links = []
        for perm in all_permissions:
            # Check if the link already exists (optional, for idempotency)
            existing_link = db.query(RolePermissions).filter_by(role_id=admin_role.id, permission_id=perm.id).first()
            if not existing_link:
                role_permissions_links.append(
                    RolePermissions(role_id=admin_role.id, permission_id=perm.id)
                )

        if role_permissions_links:
            db.add_all(role_permissions_links)

        # 5. Assign admin role to admin user
        # Check if the link already exists (optional, for idempotency)
        existing_user_role = db.query(UserRoles).filter_by(user_id=admin_user.id, role_id=admin_role.id).first()
        if not existing_user_role:
            user_role_link = UserRoles(user_id=admin_user.id, role_id=admin_role.id)
            db.add(user_role_link)

        # Commit all changes
        db.commit()
        print("Admin user and role created successfully with all available permissions.")

    except Exception as e:
        db.rollback()
        print(f"An error occurred during database initialization: {e}")

def create_base_store(db:Session) -> str:
    """
    Creates a base store if no stores exist in the database.
    """
    try:
        store_count = db.query(Stores).count()
        if store_count > 0:
            print("Stores already exist in the database. Skipping base store creation.")
            return

        print("No stores found. Creating base store...")

        base_store = Stores(name="Base Store",
                            address="Fake Address 1")
        db.add(base_store)
        db.commit()
        base_store_id = base_store.id
        print("Base store created successfully with id: ", base_store_id)
        return base_store_id
    
    except Exception as e:
        print(f"An error occurred during database initialization: {e}")
        db.rollback()
    


def create_base_customer(db:Session, store_id:str) -> str:
    """
    Creates a base customer if no customers exist in the database.
    """
    try:
        customer_count = db.query(Customers).count()
        if customer_count > 0:
            print("Customers already exist in the database. Skipping base customer creation.")
            return

        print("No customers found. Creating base customer...")

        base_customer = Customers(name="Base Customer",
                                  email="customer@customer.com",
                                  phone="123456789",
                                  store_id=store_id)
        db.add(base_customer)
        db.commit()
        base_customer_id = base_customer.id
        print("Base customer created successfully with id: ", base_customer_id)
        return base_customer_id
    except Exception as e:
        print(f"An error occurred during database initialization: {e}")
        db.rollback()
                                  

def create_base_product(db:Session, store_id:str) -> str:
    """
    Creates a base product if no products exist in the database.
    """
    try:
        product_count = db.query(Products).count()
        if product_count > 0:
            print("Products already exist in the database. Skipping base product creation.")
            return

        print("No products found. Creating base product...")

        base_product = Products(name="Base Product",
                                price=10.0,
                                stock=100,
                                store_id=store_id)
        db.add(base_product)
        db.commit()
        base_product_id = base_product.id
        print("Base product created successfully with id: ", base_product_id)
        return base_product_id
    except Exception as e:
        print(f"An error occurred during database initialization: {e}")
        db.rollback()

def create_base_order(db:Session, store_id:str, customer_id:str, product_id:str) -> str:
    """
    Creates a base order if no orders exist in the database.
    """
    try:
        order_count = db.query(Orders).count()
        if order_count > 0:
            print("Orders already exist in the database. Skipping base order creation.")
            return

        print("No orders found. Creating base order...")

        base_order_products = OrderProducts(
                                            product_id=product_id,
                                            price=10.0,
                                            quantity=1,
                                            name="Base Product")
        base_order = Orders(store_id = store_id,customer_id=customer_id, order_products=[base_order_products], total=10.0)
        
        db.add(base_order)
        db.add(base_order_products)
        db.commit()
        base_order_id = base_order.id
        print("Base order created successfully with id: ", base_order_id)
        return base_order_id
    except Exception as e:
        print(f"An error occurred during database initialization: {e}")
        db.rollback()


def initialize_database(check_existing_users: bool = True):
    """
    Initializes the database by creating an admin user if no users exist.

    Args:
        check_existing_users (bool, optional): If True, checks for existing users
                                                before creating the admin user.
                                                Defaults to True.
    """
    db: Session = next(get_db())
    try:
        create_admin_user(check_existing_users, db)
        base_store_id:str = create_base_store(db)
        base_customer_id:str = create_base_customer(db, base_store_id)
        base_product_id:str = create_base_product(db, base_store_id)
        base_order_id:str = create_base_order(db, base_store_id, base_customer_id, base_product_id)
        print(f"Finished initializing base data. \nBase_store: {base_store_id} \nBase_customer: {base_customer_id} \nBase_product: {base_product_id} \nBase_order: {base_order_id}")
    finally:
        db.close()
