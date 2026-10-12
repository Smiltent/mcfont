
FROM denoland/deno:2.9.7

WORKDIR /app
COPY deno.json deno.lock* ./

RUN deno install
COPY . .

EXPOSE 3000

CMD ["task", "start"]