# Full Demo Tutorial

This guide will walk you through setting up and running the complete Wicketkeeper ecosystem on your local machine. This includes the Go backend server, the Redis dependency, the JavaScript client widget, and a full-stack example application.

## Prerequisites

Before you begin, ensure you have the following installed:

- [**Go**](https://go.dev/doc/install) (version 1.23 or newer)
- [**Node.js**](https://nodejs.org/) (version 16 or newer) and npm
- [**Docker**](https://www.docker.com/products/docker-desktop/) and Docker Compose

## Step 1: Clone the Repository

First, clone the Wicketkeeper repository and navigate into the project directory.

```bash
git clone https://github.com/a-ve/wicketkeeper.git
cd wicketkeeper
```

## Step 2: Run the Backend Services

The backend consists of the Wicketkeeper Go server and a Redis instance for replay protection. The easiest way to run both is with Docker Compose.

Navigate to the `server/` directory and start the services.

```bash
cd server/
# The `data` directory is volume-mounted to store the generated private key.
mkdir -p data
docker-compose up -d
```

- This command builds the `wicketkeeper` Docker image and starts two containers: `wicketkeeper-app` (the Go server) and `wicketkeeper-redis`.
- The Go server will be accessible on `http://localhost:8080`.
- On the first run, a new private key will be generated and saved to `server/data/wicketkeeper.key`. This file is used to sign the captcha tokens.

## Step 3: Run the Example Application

The example application has its own backend server built with Express.js. It's responsible for **serving the frontend HTML page** and verifying the captcha solution with the Wicketkeeper server.

Navigate to the `example/` directory, install dependencies, compile the TypeScript code, and start the server.

```bash
# From the project root
cd example/
npm install
npx tsc
node dist/server.js

# In another terminal
cd example/public
npx serve
```

## Step 4: View the Demo

You're all set! **Open your browser and navigate to [http://localhost:3000](http://localhost:3000)**.

You will see the demo form. You can fill it out, solve the wicketkeeper captcha, and submit it. The example backend at port `8081` sends the form data to the same Express backend, which in turn verifies the captcha with the Go server at port `8080`. Check the terminal windows for log output from each service.
