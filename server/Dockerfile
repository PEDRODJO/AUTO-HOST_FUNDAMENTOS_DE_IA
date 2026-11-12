FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:17-jre-alpine AS production
ENV JAVA_OPTS="" PORT=3000 UPLOAD_ROOT=/app/uploads
WORKDIR /app
RUN addgroup -S autohost && adduser -S autohost -G autohost \
    && mkdir -p /app/uploads/vehicles /app/uploads/workshops \
    && chown -R autohost:autohost /app
COPY --from=build --chown=autohost:autohost /workspace/target/autohost-api-1.0.0.jar /app/app.jar
USER autohost
EXPOSE 3000
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
