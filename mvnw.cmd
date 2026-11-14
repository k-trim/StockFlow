@echo off
setlocal

set "MVN_PROJECTBASEDIR=%~dp0"
:find_mvn_dir
if exist "%MVN_PROJECTBASEDIR%\.mvn" goto found_mvn_dir
set "MVN_PROJECTBASEDIR=%MVN_PROJECTBASEDIR%.."
if "%MVN_PROJECTBASEDIR%"=="%MVN_PROJECTBASEDIR%.." goto found_mvn_dir
goto find_mvn_dir

:found_mvn_dir
if "%JAVA_HOME%"=="" (
  set "JAVA_EXEC=java"
) else (
  set "JAVA_EXEC=%JAVA_HOME%\bin\java"
)

set "WRAPPER_JAR=%MVN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"

"%JAVA_EXEC%" -classpath "%WRAPPER_JAR%" -Dmaven.multiModuleProjectDirectory="%MVN_PROJECTBASEDIR%" org.apache.maven.wrapper.MavenWrapperMain %*

endlocal
