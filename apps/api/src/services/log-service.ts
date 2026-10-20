import { existsSync, readFileSync, statSync, watch } from "node:fs";

const encoder = new TextEncoder();

export function tailFile(path: string, lines = 200) {
  if (!existsSync(path)) return "";
  const content = readFileSync(path, "utf8").split("\n");
  return content.slice(Math.max(0, content.length - lines)).join("\n");
}

export function streamFile(path: string) {
  let lastSize = existsSync(path) ? statSync(path).size : 0;
  let watcher: ReturnType<typeof watch> | null = null;
  return new ReadableStream({
    start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      if (existsSync(path)) {
        const lines = tailFile(path, 80);
        for (const line of lines.split("\n")) {
          if (line.trim()) send(line);
        }
      } else {
        send(JSON.stringify({ level: "info", message: "log stream waiting for first entries" }));
      }
      try {
        watcher = watch(path, { persistent: false }, () => {
          if (!existsSync(path)) return;
          const size = statSync(path).size;
          if (size < lastSize) lastSize = 0;
          const fd = readFileSync(path, "utf8");
          const next = fd.slice(lastSize);
          lastSize = size;
          for (const line of next.split("\n")) {
            if (line.trim()) send(line);
          }
        });
      } catch {
        watcher = null;
      }
    },
    cancel() {
      watcher?.close();
    },
  });
}
