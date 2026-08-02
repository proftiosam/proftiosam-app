import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Fora do browser o driver do Neon precisa de um WebSocket. O Node 22 já traz
// um global, mas o `ws` é o caminho que o driver documenta e testa — não vale
// economizar uma dependência de 40kB para descobrir isso em produção.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não está definida. Copie .env.example para .env.");
}

// Pool em vez do driver HTTP porque o check-in precisa de transação:
// conferir o teto do dia e gravar a linha têm que ser a mesma operação,
// senão dois toques rápidos furam o limite de 3.
const pool = new Pool({ connectionString: url });

export const db = drizzle(pool, { schema });
export { schema };
