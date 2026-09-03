import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Servidor Java opcional para executar o Diário de Treino localmente.
 *
 * Coloque este arquivo na mesma pasta de index.html, style.css e app.js.
 * Ele serve somente arquivos estáticos e não altera a biblioteca de exercícios.
 */
public class DiarioTreinoServer {
    private static final int PORT = 8080;
    private static final Path ROOT = Paths.get("." ).toAbsolutePath().normalize();

    private static final Map<String, String> CONTENT_TYPES = Map.of(
        ".html", "text/html; charset=UTF-8",
        ".css", "text/css; charset=UTF-8",
        ".js", "text/javascript; charset=UTF-8",
        ".json", "application/json; charset=UTF-8",
        ".png", "image/png",
        ".jpg", "image/jpeg",
        ".jpeg", "image/jpeg",
        ".svg", "image/svg+xml",
        ".ico", "image/x-icon"
    );

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/", DiarioTreinoServer::handleRequest);
        server.setExecutor(null);
        server.start();

        System.out.println("Diário de Treino disponível em: http://localhost:" + PORT );
        System.out.println("Pasta servida: " + ROOT);
        System.out.println("Pressione Ctrl+C para encerrar.");
    }

    private static void handleRequest(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Método não permitido");
            return;
        }

        String requestedPath = exchange.getRequestURI().getPath();
        if (requestedPath == null || requestedPath.equals("/") || requestedPath.isBlank()) {
            requestedPath = "/index.html";
        }

        Path file = ROOT.resolve(requestedPath.substring(1)).normalize();
        if (!file.startsWith(ROOT) || !Files.isRegularFile(file)) {
            sendText(exchange, 404, "Arquivo não encontrado");
            return;
        }

        byte[] content = Files.readAllBytes(file);
        String contentType = contentTypeFor(file);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
        exchange.sendResponseHeaders(200, content.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(content);
        }
    }

    private static String contentTypeFor(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        int dot = name.lastIndexOf('.');
        if (dot >= 0) {
            return CONTENT_TYPES.getOrDefault(name.substring(dot), "application/octet-stream");
        }
        return "application/octet-stream";
    }

    private static void sendText(HttpExchange exchange, int status, String message) throws IOException {
        byte[] content = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(status, content.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(content);
        }
    }
}
