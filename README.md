# Ongoing project
This is an ongoing portfolio project. The documentation is not yet ready.
If you're interested in looking into the code, I suggest diving into the app folder, which contains the important part of the code:
* The example database in the `app.db` file if you want to check the structure (**SQLite3**)
* The authentication method and RBAC validations within the `auth/oauth2.py` file (`JWT Token`)
* The structure of the database tables within the `database/models` folder (`SQLAlchemy`)
* The logic for each endpoint within their respective routers.

Keep in mind that the current version is merely a base template I'm creating, which will be greatly expanded with more advanced features such as:
* Multiple price lists and currency control
* Multiple Distribution Centers and robust stock and stock control logic
* Complex promotions module including a simplified version for quicker settings
* Order payment logic with different stock reserve options, and simulated payment methods
* and more!

Feel free to contact me regarding any questions or if you'd like to recommend changes and improvements. I'm always more than happy to recieve feedback!
