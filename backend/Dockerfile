# Build stage
FROM rust:1.84.1-alpine3.20 AS builder
WORKDIR /app
RUN apk add --no-cache \
    build-base \
    perl \
    pkgconfig \
    libffi-dev \
    musl-dev \
    musl \
    openssl \
    openssl-dev \
    openssl-libs-static
RUN openssl version
COPY Cargo.toml Cargo.lock ./
COPY ./src ./src
RUN cargo build --release

# Production stage
FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache openssl
RUN openssl version
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
EXPOSE 10000
CMD ["/usr/local/bin/backend"]