import { existsSync, readFileSync, statSync, watch } from "node:fs";

export function tailFile(path: string, lines = 200) {
  if (!existsSync(path)) return "";
  const content = readFileSync(path, "utf8").split("\n");
  return content.slice(Math.max(0, content.length - lines)).join("\n");
}

export function streamFile(path: string) {
  let lastSize = existsSync(path) ? statSync(path).size : 0;
  return new ReadableStream({
    start(controller) {
      const send = (line: string) => controller.enqueue(`data: ${line}\n\n`);
      if (existsSync(path)) {
        const lines = tailFile(path, 80);
        for (const line of lines.split("\n")) {
          if (line.trim()) send(line);
        }
      }
      const watcher = watch(path, { persistent: false }, () => {
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
      controller.enqueue(`retry: 2000\n\n`);
      return () => watcher.close();
    },
    cancel() {
      return;
    },
  });
}
