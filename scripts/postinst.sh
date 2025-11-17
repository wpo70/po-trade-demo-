#!/bin/sh

# To install PO Trade copy the potrade folder to /volume1/system/potrade then
# run this script as root: sh /volume1/system/potrade/scripts/postinst.sh.

# Get the installation directory

SCRIPTDIR=$(dirname $0)
BASEDIR=$(dirname $SCRIPTDIR)
echo $BASEDIR

# Change owner and group to potrade.  Make everything read only, except for the
# scripts.

chown -R potrade.users $BASEDIR
chmod 755 $BASEDIR
find $BASEDIR -type d -exec chmod 755 {} \;
find $BASEDIR -type f -exec chmod 644 {} \;
find $BASEDIR -name '*.sh' -exec chmod 755 {} \;

# Install the Node scripts

cd $BASEDIR
npm install --production

# Run the boot script to copy the Postgresql and PO Trade configuration files to
# their target locations

$SCRIPTDIR/bootcopy.sh -f
