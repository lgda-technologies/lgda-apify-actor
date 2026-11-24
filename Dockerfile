# LGDA Wellness Music Actor
# Node.js 22 base image, plus ffmpeg: 14 of the 27 tracks are stored as WAV
# masters and are transcoded to 320 kbps MP3 at runtime.
FROM apify/actor-node:22


# apify/actor-node is Alpine Linux, so use apk (not apt-get) as root.
USER root
RUN apk add --no-cache ffmpeg
USER myuser


# Copy just package.json and package-lock.json to speed up the build
# using Docker layer cache.
COPY --chown=myuser:myuser package*.json ./


# Install NPM packages, skip optional and development dependencies to
# keep the image small.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm


# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY --chown=myuser:myuser . ./


# Run the image.
CMD npm start --silent

