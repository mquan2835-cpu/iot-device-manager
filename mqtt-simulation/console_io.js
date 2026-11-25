/**
 * Ô nhập lệnh cố định ở dòng cuối cùng của Terminal.
 * Mọi dòng log mới được in PHÍA TRÊN, còn chữ bạn đang gõ dở ở dòng "> " được giữ nguyên,
 * nên vẫn gõ lệnh bình thường kể cả khi màn hình đang có log chạy.
 */
const readline = require('readline');

function createConsole(onLine) {
  const tty = process.stdin.isTTY && process.stdout.isTTY;
  const rl = readline.createInterface({ input: process.stdin, output: tty ? process.stdout : undefined, prompt: '> ' });

  if (tty) {
    const originalLog = console.log.bind(console);
    console.log = (...args) => {
      readline.clearLine(process.stdout, 0);   // xoá dòng "> ..." đang gõ dở
      readline.cursorTo(process.stdout, 0);
      originalLog(...args);                    // in log
      rl.prompt(true);                         // vẽ lại "> " kèm chữ đang gõ dở
    };
  }

  rl.on('line', (line) => {
    onLine(line);
    if (tty) rl.prompt();
  });
  rl.on('SIGINT', () => process.exit(0));      // Ctrl+C thoát ngay
  if (tty) rl.prompt();
  return rl;
}

module.exports = { createConsole };
