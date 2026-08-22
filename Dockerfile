FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --chown=node:node server.js index.html package.json ./
COPY --chown=node:node css/ css/
COPY --chown=node:node js/ js/
COPY --chown=node:node data/ data/
COPY --chown=node:node assets/ assets/

USER node
EXPOSE 8088
CMD ["node", "server.js"]
