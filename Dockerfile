FROM node:alpine AS builder_web

WORKDIR /app

COPY ./client/webpack.config.js ./client/package*.json ./
COPY ./client/src ./src

RUN npm i && npm run build:fast && npm run build:slow

FROM golang:1.23-alpine3.22 AS builder

WORKDIR /app

COPY ./server/go.mod ./server/go.sum ./
RUN go mod download

COPY ./server ./
COPY --from=builder_web /app/dist ./static

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o wicketkeeper .

FROM gcr.io/distroless/static-debian12 AS final

WORKDIR /app

COPY --from=builder /app/wicketkeeper .

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["./wicketkeeper"]