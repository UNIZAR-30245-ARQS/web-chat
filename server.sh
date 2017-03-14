#!/bin/bash
PRIVATE_ENV_VARS_FILE=$HOME/private-env-vars.sh
# Load environment variables with values that should not be in GitHub
if [ -f "$PRIVATE_ENV_VARS_FILE" ];
then   
   source "$PRIVATE_ENV_VARS_FILE"
fi
nodejs server.js