FROM node:lts-slim

# Create app directory
WORKDIR /app

# yarn install
ADD ./package.json /app/package.json
ADD ./yarn.lock /app/yarn.lock
RUN yarn install --ignore-engines --frozen-lockfile

# Copy all files
ADD . /app

# yarn lint
RUN yarn lint
# yarn build
RUN NODE_ENV=production yarn build


ENV HOST 0.0.0.0
EXPOSE 1337

# start command
CMD yarn build && yarn start