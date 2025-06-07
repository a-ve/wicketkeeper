FROM golang:1.23-alpine3.22 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o wicketkeeper .

FROM gcr.io/distroless/static-debian12 AS final

WORKDIR /app

COPY --from=builder /app/wicketkeeper .

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["./wicketkeeper"]