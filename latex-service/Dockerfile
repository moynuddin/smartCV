FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY latex-service/server.mjs ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.mjs"]
