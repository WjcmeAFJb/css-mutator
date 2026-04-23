FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /build

# Copy the css-mutator packed tarball
COPY packages/css-mutator/css-mutator.tgz /build/css-mutator.tgz

# Copy the e2e demo project
COPY packages/css-mutator/test/e2e/project /build/demo

# Install demo deps + local css-mutator
WORKDIR /build/demo
RUN npm install /build/css-mutator.tgz 2>&1 | tail -5
RUN npm install 2>&1 | tail -5

CMD ["sh", "-c", "npm test && npm run test:mutate:css"]
