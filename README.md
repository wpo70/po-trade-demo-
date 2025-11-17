# Potrade

## Installation

Install NodeJS LTS from nodejs.org
Install VS Code from code.visualstudio.com
Install TortoiseSVN
Clone the potrade repository at https://github.com/POCapital/potrade.git
Install development modules: npm install

## Environment
Enable powershell scripts.  Run powershell as administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
Development server
In the VS Code terminal type

    npm run dev

When this command is first run it will generate warnings and fail to generate public/build/bundle.css.  However, while rollup is watching (started by npm run dev), it will correctly generate bundle.css after source files are edited.
Open your browser at localhost:8080.

## Production server
Use the npm run dev command described above to correctly generate bundle.css.  Make a copy of bundle.css.  Stop the development server and run the command

    npm run build

Copy the saved bundle.css to public/build/bundle.css (overwriting the one that is there).

## Deployment

### Client and server

Install NodeJS on the server if it isn’t already.
Copy package.json and the public, server and scripts folders to the target location, opt/potrade, on a systemd version of Linux (such as Debian).  In the folder with package.json run the command

    npm install –production

Open your browser at localhost:8080.  Install scripts/potrade.service as per the instructions in that file.

## Database

Install PostgresQL and phpPgAdmin (if it is available) on the server if it isn’t already.
Create the database by running all commands in database/po_trade_dump.sql.  This is done by pasting the file into the SQL command window of phpPgAdmin.  Edit /opt/potrade/server/db/index.js and set the connection settings to match the database name, user and password.
