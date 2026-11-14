#!/bin/sh
# Minimal Maven Wrapper script (Unix).

MVN_PROJECTBASEDIR=$(pwd)
while [ ! -d "$MVN_PROJECTBASEDIR/.mvn" ] && [ "$MVN_PROJECTBASEDIR" != "/" ]; do
  MVN_PROJECTBASEDIR=$(dirname "$MVN_PROJECTBASEDIR")
done

if [ -z "$JAVA_HOME" ]; then
  JAVA_EXEC="java"
else
  JAVA_EXEC="$JAVA_HOME/bin/java"
fi

WRAPPER_JAR="$MVN_PROJECTBASEDIR/.mvn/wrapper/maven-wrapper.jar"

exec "$JAVA_EXEC" -classpath "$WRAPPER_JAR" \
  -Dmaven.multiModuleProjectDirectory="$MVN_PROJECTBASEDIR" \
  org.apache.maven.wrapper.MavenWrapperMain "$@"
