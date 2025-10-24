FROM alpine:latest as builder

# Primeira camada - instalação de dependências
RUN apk add --no-cache curl

# Segunda camada - download de arquivo
RUN curl -o /tmp/example.txt https://example.com/

# Terceira camada - processamento
RUN echo "BuildKit Cache Test" > /tmp/test.txt && \
    cat /tmp/example.txt >> /tmp/test.txt

# Imagem final
FROM alpine:latest
COPY --from=builder /tmp/test.txt /app/test.txt
CMD ["cat", "/app/test.txt"]
