#!/bin/sh

SCRIPTDIR=$(dirname $0)
PG_CONF_DIR="/etc/postgresql"
INIT_DIR="/etc/init"

# If the target pg_hba.conf has been removed or changed (by an operating system
# upgrade) then overwrite it with our modified one.

if [ $# -eq 1 ] || [ ! -e $PG_CONF_DIR/pg_hba.conf ] || ! cmp $SCRIPTDIR/pg_hba.conf $PG_CONF_DIR/pg_hba.conf >/dev/null 2>&1
then
  echo "Installing pg_hba.conf"
  # Overwrite the target pg_hba.conf with our one.

  cp $SCRIPTDIR/pg_hba.conf $PG_CONF_DIR
  chown postgres.postgres $PG_CONF_DIR/pg_hba.conf
  chmod 600 $PG_CONF_DIR/pg_hba.conf

  # Make PostgreSQL listen on the network (instead of just localhost)

  sed -i "/listen_addresses/c\listen_addresses = '*'" $PG_CONF_DIR/postgresql.conf
  
  # Restart the postgresql service

  su - postgres -c "pg_ctl -m fast restart"
fi

# If the target potrade.conf has been removed or changed (by an operating system
# upgrade) then overwrite it with our custom one.

if [ $# -eq 1 ] || [ ! -e $INIT_DIR/potrade.conf ] || ! cmp $SCRIPTDIR/potrade.conf $INIT_DIR/potrade.conf >/dev/null 2>&1
then
  echo "Installing potrade.conf"

  # Install the potrade.conf file

  cp $SCRIPTDIR/potrade.conf $INIT_DIR
  chown root.root $INIT_DIR/potrade.conf
  chmod 755 $INIT_DIR/potrade.conf

  # Start the PO Trade service

  start potrade
fi
